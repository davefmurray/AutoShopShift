"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function claimOpenShift(shiftId: string, shopId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.from("open_shift_claims").insert({
    shop_id: shopId,
    shift_id: shiftId,
    user_id: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/schedule");
  return { success: true };
}

export async function approveClaim(claimId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Get the claim
  const { data: claim } = await supabase
    .from("open_shift_claims")
    .select("*")
    .eq("id", claimId)
    .single();

  if (!claim) return { error: "Claim not found" };

  // Update claim status
  const { error: claimError } = await supabase
    .from("open_shift_claims")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", claimId);

  if (claimError) return { error: claimError.message };

  // Assign the shift to the claimant
  const claimData = claim as { user_id: string; shift_id: string };
  await supabase
    .from("shifts")
    .update({ user_id: claimData.user_id, is_open: false })
    .eq("id", claimData.shift_id);

  // Deny other pending claims for the same shift
  await supabase
    .from("open_shift_claims")
    .update({
      status: "denied",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("shift_id", claimData.shift_id)
    .eq("status", "pending")
    .neq("id", claimId);

  revalidatePath("/schedule");
  revalidatePath("/swaps");
  return { success: true };
}

export async function denyClaim(claimId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("open_shift_claims")
    .update({
      status: "denied",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", claimId);

  if (error) return { error: error.message };
  revalidatePath("/swaps");
  return { success: true };
}
