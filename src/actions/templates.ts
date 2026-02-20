"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { addDays, format, startOfWeek } from "date-fns";

export async function createShiftTemplate(data: {
  shop_id: string;
  name: string;
  position_id?: string;
  start_time: string;
  end_time: string;
  break_minutes?: number;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("shift_templates").insert(data);

  if (error) return { error: error.message };
  revalidatePath("/templates");
  return { success: true };
}

export async function updateShiftTemplate(
  id: string,
  data: {
    name?: string;
    position_id?: string | null;
    start_time?: string;
    end_time?: string;
    break_minutes?: number;
  }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shift_templates")
    .update(data)
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/templates");
  return { success: true };
}

export async function deleteShiftTemplate(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shift_templates")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/templates");
  return { success: true };
}

export async function createScheduleTemplate(data: {
  shop_id: string;
  name: string;
}) {
  const supabase = await createClient();
  const { data: template, error } = await supabase
    .from("schedule_templates")
    .insert(data)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/templates");
  return { data: template };
}

export async function deleteScheduleTemplate(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("schedule_templates")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/templates");
  return { success: true };
}

export async function applyScheduleTemplate(
  templateId: string,
  shopId: string,
  weekStartDate: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Get template entries
  const { data: entries } = await supabase
    .from("schedule_template_entries")
    .select("*")
    .eq("template_id", templateId);

  if (!entries?.length) return { error: "Template has no entries" };

  const weekStart = startOfWeek(new Date(weekStartDate), { weekStartsOn: 0 });

  // Generate shifts from template entries
  const shifts = entries.map(
    (entry: {
      day_of_week: number;
      start_time: string;
      end_time: string;
      position_id: string | null;
      user_id: string | null;
      break_minutes: number;
    }) => {
      const date = addDays(weekStart, entry.day_of_week);
      const dateStr = format(date, "yyyy-MM-dd");
      return {
        shop_id: shopId,
        position_id: entry.position_id,
        user_id: entry.user_id,
        start_time: `${dateStr}T${entry.start_time}`,
        end_time: `${dateStr}T${entry.end_time}`,
        break_minutes: entry.break_minutes,
        status: "draft",
        created_by: user.id,
      };
    }
  );

  const { error } = await supabase.from("shifts").insert(shifts);
  if (error) return { error: error.message };

  revalidatePath("/schedule");
  return { success: true, count: shifts.length };
}
