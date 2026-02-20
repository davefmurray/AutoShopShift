"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createShift(data: {
  shop_id: string;
  schedule_id?: string;
  user_id?: string;
  position_id?: string;
  start_time: string;
  end_time: string;
  break_minutes?: number;
  is_open?: boolean;
  notes?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: shift, error } = await supabase
    .from("shifts")
    .insert({
      ...data,
      created_by: user.id,
      status: "draft",
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/schedule");
  return { data: shift };
}

export async function updateShift(
  shiftId: string,
  data: {
    user_id?: string | null;
    position_id?: string | null;
    schedule_id?: string | null;
    start_time?: string;
    end_time?: string;
    break_minutes?: number;
    is_open?: boolean;
    notes?: string | null;
  }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shifts")
    .update(data)
    .eq("id", shiftId);

  if (error) return { error: error.message };
  revalidatePath("/schedule");
  return { success: true };
}

export async function deleteShift(shiftId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("shifts").delete().eq("id", shiftId);

  if (error) return { error: error.message };
  revalidatePath("/schedule");
  return { success: true };
}

export async function publishShifts(shiftIds: string[]) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shifts")
    .update({ status: "published" })
    .in("id", shiftIds);

  if (error) return { error: error.message };
  revalidatePath("/schedule");
  return { success: true };
}

export async function unpublishShifts(shiftIds: string[]) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shifts")
    .update({ status: "draft" })
    .in("id", shiftIds);

  if (error) return { error: error.message };
  revalidatePath("/schedule");
  return { success: true };
}

export async function assignShift(shiftId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shifts")
    .update({ user_id: userId, is_open: false })
    .eq("id", shiftId);

  if (error) return { error: error.message };
  revalidatePath("/schedule");
  return { success: true };
}

export async function unassignShift(shiftId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shifts")
    .update({ user_id: null })
    .eq("id", shiftId);

  if (error) return { error: error.message };
  revalidatePath("/schedule");
  return { success: true };
}
