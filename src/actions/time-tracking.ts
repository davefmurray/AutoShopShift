"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-log";

export async function clockIn(shopId: string, shiftId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Check for active clock
  const { data: active } = await supabase
    .from("time_records")
    .select("id")
    .eq("shop_id", shopId)
    .eq("user_id", user.id)
    .eq("status", "clocked_in")
    .limit(1);

  if (active?.length) return { error: "Already clocked in" };

  const { data: onBreak } = await supabase
    .from("time_records")
    .select("id")
    .eq("shop_id", shopId)
    .eq("user_id", user.id)
    .eq("status", "on_break")
    .limit(1);

  if (onBreak?.length) return { error: "Already clocked in (on break)" };

  const { data: record, error } = await supabase
    .from("time_records")
    .insert({
      shop_id: shopId,
      user_id: user.id,
      shift_id: shiftId || null,
      clock_in: new Date().toISOString(),
      status: "clocked_in",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await logActivity(supabase, {
    shop_id: shopId,
    entity_type: "time_record",
    entity_id: record.id,
    action: "clock_in",
    actor_id: user.id,
    description: "Clocked in",
  });

  revalidatePath("/time-clock");
  return { success: true };
}

export async function clockOut(timeRecordId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Fetch time record for shop_id
  const { data: record } = await supabase
    .from("time_records")
    .select("shop_id, user_id")
    .eq("id", timeRecordId)
    .single();

  // End any active breaks first
  const { data: activeBreaks } = await supabase
    .from("breaks")
    .select("id")
    .eq("time_record_id", timeRecordId)
    .is("end_time", null);

  if (activeBreaks?.length) {
    for (const b of activeBreaks) {
      await supabase
        .from("breaks")
        .update({ end_time: new Date().toISOString() })
        .eq("id", (b as { id: string }).id);
    }
  }

  const { error } = await supabase
    .from("time_records")
    .update({
      clock_out: new Date().toISOString(),
      status: "clocked_out",
    })
    .eq("id", timeRecordId);

  if (error) return { error: error.message };

  if (record) {
    const r = record as { shop_id: string; user_id: string };
    await logActivity(supabase, {
      shop_id: r.shop_id,
      entity_type: "time_record",
      entity_id: timeRecordId,
      action: "clock_out",
      actor_id: user.id,
      target_user_id: r.user_id !== user.id ? r.user_id : undefined,
      description: "Clocked out",
    });
  }

  revalidatePath("/time-clock");
  return { success: true };
}

export async function startBreak(timeRecordId: string, isPaid: boolean = false) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: record } = await supabase
    .from("time_records")
    .select("shop_id, user_id")
    .eq("id", timeRecordId)
    .single();

  // Update time record status
  await supabase
    .from("time_records")
    .update({ status: "on_break" })
    .eq("id", timeRecordId);

  const { error } = await supabase.from("breaks").insert({
    time_record_id: timeRecordId,
    start_time: new Date().toISOString(),
    is_paid: isPaid,
  });

  if (error) return { error: error.message };

  if (record) {
    const r = record as { shop_id: string; user_id: string };
    await logActivity(supabase, {
      shop_id: r.shop_id,
      entity_type: "time_record",
      entity_id: timeRecordId,
      action: "start_break",
      actor_id: user.id,
      description: "Started break",
    });
  }

  revalidatePath("/time-clock");
  return { success: true };
}

export async function endBreak(timeRecordId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: record } = await supabase
    .from("time_records")
    .select("shop_id, user_id")
    .eq("id", timeRecordId)
    .single();

  // Find active break
  const { data: activeBreak } = await supabase
    .from("breaks")
    .select("id")
    .eq("time_record_id", timeRecordId)
    .is("end_time", null)
    .single();

  if (activeBreak) {
    await supabase
      .from("breaks")
      .update({ end_time: new Date().toISOString() })
      .eq("id", (activeBreak as { id: string }).id);
  }

  await supabase
    .from("time_records")
    .update({ status: "clocked_in" })
    .eq("id", timeRecordId);

  if (record) {
    const r = record as { shop_id: string; user_id: string };
    await logActivity(supabase, {
      shop_id: r.shop_id,
      entity_type: "time_record",
      entity_id: timeRecordId,
      action: "end_break",
      actor_id: user.id,
      description: "Ended break",
    });
  }

  revalidatePath("/time-clock");
  return { success: true };
}

export async function createManualEntry(data: {
  shop_id: string;
  user_id: string;
  clock_in: string;
  clock_out: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: record, error } = await supabase
    .from("time_records")
    .insert({
      ...data,
      status: "clocked_out",
      is_manual: true,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await logActivity(supabase, {
    shop_id: data.shop_id,
    entity_type: "time_record",
    entity_id: record.id,
    action: "create",
    actor_id: user.id,
    target_user_id: data.user_id !== user.id ? data.user_id : undefined,
    description: "Manual time entry created",
  });

  revalidatePath("/time-clock");
  return { success: true };
}
