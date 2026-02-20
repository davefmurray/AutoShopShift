"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function requestSwap(data: {
  shop_id: string;
  requester_shift_id: string;
  target_shift_id?: string;
  target_id?: string;
  reason?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.from("swap_requests").insert({
    ...data,
    requester_id: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/swaps");
  return { success: true };
}

export async function approveSwap(swapId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: swap } = await supabase
    .from("swap_requests")
    .select("*")
    .eq("id", swapId)
    .single();

  if (!swap) return { error: "Swap not found" };

  const swapData = swap as {
    requester_shift_id: string;
    target_shift_id: string | null;
    requester_id: string;
    target_id: string | null;
  };

  // Update swap status
  const { error: swapError } = await supabase
    .from("swap_requests")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", swapId);

  if (swapError) return { error: swapError.message };

  // Execute the swap — exchange user_ids on both shifts
  if (swapData.target_shift_id && swapData.target_id) {
    await supabase
      .from("shifts")
      .update({ user_id: swapData.target_id })
      .eq("id", swapData.requester_shift_id);

    await supabase
      .from("shifts")
      .update({ user_id: swapData.requester_id })
      .eq("id", swapData.target_shift_id);
  }

  revalidatePath("/schedule");
  revalidatePath("/swaps");
  return { success: true };
}

export async function denySwap(swapId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("swap_requests")
    .update({
      status: "denied",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", swapId);

  if (error) return { error: error.message };
  revalidatePath("/swaps");
  return { success: true };
}

export async function cancelSwap(swapId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("swap_requests")
    .update({ status: "cancelled" })
    .eq("id", swapId)
    .eq("requester_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/swaps");
  return { success: true };
}
