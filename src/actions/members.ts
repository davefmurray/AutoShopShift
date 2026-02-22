"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function archiveMember(memberId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Fetch member — validate exists, not owner, currently active
  const { data: member } = await supabase
    .from("shop_members")
    .select("*")
    .eq("id", memberId)
    .single();

  if (!member) return { error: "Member not found" };

  const m = member as {
    id: string;
    user_id: string;
    shop_id: string;
    role: string;
    is_active: boolean;
  };

  if (m.role === "owner") return { error: "Cannot archive a shop owner" };
  if (!m.is_active) return { error: "Member is already archived" };

  // Set is_active = false
  const { error: updateError } = await supabase
    .from("shop_members")
    .update({ is_active: false })
    .eq("id", memberId);

  if (updateError) return { error: updateError.message };

  // Delete all future shifts for this member at this shop
  const now = new Date().toISOString();
  await supabase
    .from("shifts")
    .delete()
    .eq("user_id", m.user_id)
    .eq("shop_id", m.shop_id)
    .gt("start_time", now);

  // Cancel pending swap requests where this user is requester or target
  await supabase
    .from("swap_requests")
    .update({ status: "cancelled" })
    .eq("requester_id", m.user_id)
    .eq("status", "pending");

  await supabase
    .from("swap_requests")
    .update({ status: "cancelled" })
    .eq("target_id", m.user_id)
    .eq("status", "pending");

  // Cancel pending open shift claims for this user
  await supabase
    .from("open_shift_claims")
    .update({ status: "denied" })
    .eq("user_id", m.user_id)
    .eq("status", "pending");

  revalidatePath("/team");
  revalidatePath("/schedule");
  revalidatePath("/swaps");
  return { success: true };
}

export async function restoreMember(memberId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Fetch member — validate exists and is archived
  const { data: member } = await supabase
    .from("shop_members")
    .select("*")
    .eq("id", memberId)
    .single();

  if (!member) return { error: "Member not found" };

  const m = member as { is_active: boolean };
  if (m.is_active) return { error: "Member is already active" };

  const { error: updateError } = await supabase
    .from("shop_members")
    .update({ is_active: true })
    .eq("id", memberId);

  if (updateError) return { error: updateError.message };

  revalidatePath("/team");
  return { success: true };
}
