"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { addDays, format, startOfWeek } from "date-fns";
import { logActivity } from "@/lib/activity-log";

export async function createShiftTemplate(data: {
  shop_id: string;
  name: string;
  position_id?: string;
  start_time: string;
  end_time: string;
  break_minutes?: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.from("shift_templates").insert(data);

  if (error) return { error: error.message };

  await logActivity(supabase, {
    shop_id: data.shop_id,
    entity_type: "template",
    action: "create",
    actor_id: user.id,
    description: `Created shift template ${data.name}`,
  });

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: template } = await supabase
    .from("shift_templates")
    .select("shop_id, name")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("shift_templates")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  if (template) {
    const t = template as { shop_id: string; name: string };
    await logActivity(supabase, {
      shop_id: t.shop_id,
      entity_type: "template",
      entity_id: id,
      action: "delete",
      actor_id: user.id,
      description: `Deleted shift template ${t.name}`,
    });
  }

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

  await logActivity(supabase, {
    shop_id: shopId,
    entity_type: "template",
    entity_id: templateId,
    action: "apply",
    actor_id: user.id,
    description: `Applied schedule template (${shifts.length} shifts)`,
  });

  revalidatePath("/schedule");
  return { success: true, count: shifts.length };
}
