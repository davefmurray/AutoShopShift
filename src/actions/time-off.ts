"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notifications";
import { logActivity } from "@/lib/activity-log";

export async function requestTimeOff(data: {
  shop_id: string;
  start_date: string;
  end_date: string;
  hours_requested: number;
  reason?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.from("time_off_requests").insert({
    shop_id: data.shop_id,
    user_id: user.id,
    start_date: data.start_date,
    end_date: data.end_date,
    hours_requested: data.hours_requested,
    reason: data.reason,
  });

  if (error) return { error: error.message };

  await logActivity(supabase, {
    shop_id: data.shop_id,
    entity_type: "time_off",
    action: "create",
    actor_id: user.id,
    description: `Requested time off ${data.start_date} - ${data.end_date}`,
  });

  // Notify managers/owners
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const requesterName =
    (profile as { full_name: string | null } | null)?.full_name ?? "A team member";

  const { data: admins } = await supabase
    .from("shop_members")
    .select("user_id")
    .eq("shop_id", data.shop_id)
    .eq("is_active", true)
    .in("role", ["owner", "manager"]);

  if (admins?.length) {
    for (const admin of admins) {
      await createNotification({
        shop_id: data.shop_id,
        user_id: (admin as { user_id: string }).user_id,
        type: "time_off_requested",
        title: "Time Off Request",
        body: `${requesterName} requested time off from ${data.start_date} to ${data.end_date}`,
      });
    }
  }

  revalidatePath("/time-off");
  return { success: true };
}

export async function approveTimeOff(requestId: string, isPaid: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: request } = await supabase
    .from("time_off_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!request) return { error: "Request not found" };

  const { error } = await supabase
    .from("time_off_requests")
    .update({
      status: "approved",
      is_paid: isPaid,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) return { error: error.message };

  const reqData = request as { user_id: string; shop_id: string; start_date: string; end_date: string };

  await logActivity(supabase, {
    shop_id: reqData.shop_id,
    entity_type: "time_off",
    entity_id: requestId,
    action: "approve",
    actor_id: user.id,
    target_user_id: reqData.user_id,
    description: `Approved time off request ${reqData.start_date} - ${reqData.end_date}`,
  });

  await createNotification({
    shop_id: reqData.shop_id,
    user_id: reqData.user_id,
    type: "time_off_approved",
    title: "Time Off Approved",
    body: `Your time off request for ${reqData.start_date} to ${reqData.end_date} has been approved (${isPaid ? "paid" : "unpaid"})`,
  });

  revalidatePath("/time-off");
  return { success: true };
}

export async function denyTimeOff(requestId: string, reviewerNotes?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: request } = await supabase
    .from("time_off_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!request) return { error: "Request not found" };

  const { error } = await supabase
    .from("time_off_requests")
    .update({
      status: "denied",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: reviewerNotes,
    })
    .eq("id", requestId);

  if (error) return { error: error.message };

  const reqData = request as { user_id: string; shop_id: string; start_date: string; end_date: string };

  await logActivity(supabase, {
    shop_id: reqData.shop_id,
    entity_type: "time_off",
    entity_id: requestId,
    action: "deny",
    actor_id: user.id,
    target_user_id: reqData.user_id,
    description: `Denied time off request ${reqData.start_date} - ${reqData.end_date}`,
  });

  await createNotification({
    shop_id: reqData.shop_id,
    user_id: reqData.user_id,
    type: "time_off_denied",
    title: "Time Off Denied",
    body: `Your time off request for ${reqData.start_date} to ${reqData.end_date} has been denied${reviewerNotes ? `: ${reviewerNotes}` : ""}`,
  });

  revalidatePath("/time-off");
  return { success: true };
}

export async function cancelTimeOff(requestId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: request } = await supabase
    .from("time_off_requests")
    .select("shop_id")
    .eq("id", requestId)
    .single();

  const { error } = await supabase
    .from("time_off_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId)
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (error) return { error: error.message };

  if (request) {
    const r = request as { shop_id: string };
    await logActivity(supabase, {
      shop_id: r.shop_id,
      entity_type: "time_off",
      entity_id: requestId,
      action: "cancel",
      actor_id: user.id,
      description: "Cancelled time off request",
    });
  }

  revalidatePath("/time-off");
  return { success: true };
}

export async function adjustPtoBalance(data: {
  shop_id: string;
  user_id: string;
  hours: number;
  reason: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.from("pto_balance_adjustments").insert({
    shop_id: data.shop_id,
    user_id: data.user_id,
    hours: data.hours,
    reason: data.reason,
    created_by: user.id,
  });

  if (error) return { error: error.message };

  await logActivity(supabase, {
    shop_id: data.shop_id,
    entity_type: "pto",
    action: "adjust",
    actor_id: user.id,
    target_user_id: data.user_id,
    description: `PTO balance adjusted by ${data.hours > 0 ? "+" : ""}${data.hours}h`,
  });

  revalidatePath("/time-off");
  return { success: true };
}
