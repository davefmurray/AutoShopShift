"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

  const { error } = await supabase.from("time_records").insert({
    shop_id: shopId,
    user_id: user.id,
    shift_id: shiftId || null,
    clock_in: new Date().toISOString(),
    status: "clocked_in",
    created_by: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/time-clock");
  return { success: true };
}

export async function clockOut(timeRecordId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

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
  revalidatePath("/time-clock");
  return { success: true };
}

export async function startBreak(timeRecordId: string, isPaid: boolean = false) {
  const supabase = await createClient();

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
  revalidatePath("/time-clock");
  return { success: true };
}

export async function endBreak(timeRecordId: string) {
  const supabase = await createClient();

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

  const { error } = await supabase.from("time_records").insert({
    ...data,
    status: "clocked_out",
    is_manual: true,
    created_by: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/time-clock");
  return { success: true };
}
