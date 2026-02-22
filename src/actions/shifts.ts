"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { addDays, addWeeks, endOfWeek, startOfWeek } from "date-fns";

type BreakInput = {
  label: string;
  duration_minutes: number;
  is_paid: boolean;
};

type RecurrenceInput = {
  frequency: "weekly" | "biweekly";
  days: number[]; // 0=Sun, 1=Mon, ...
  endType: "never" | "on_date";
  endDate?: string;
};

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
  color?: string;
  breaks?: BreakInput[];
  tag_ids?: string[];
  recurrence?: RecurrenceInput;
  save_as_template?: { name: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const {
    breaks: breakInputs,
    tag_ids,
    recurrence,
    save_as_template,
    ...shiftData
  } = data;

  // Generate recurrence_group_id if recurring
  const recurrence_group_id = recurrence
    ? crypto.randomUUID()
    : undefined;

  // Insert primary shift
  const { data: shift, error } = await supabase
    .from("shifts")
    .insert({
      ...shiftData,
      recurrence_group_id,
      created_by: user.id,
      status: "draft",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Insert breaks
  if (breakInputs?.length) {
    const { error: breakErr } = await supabase
      .from("shift_breaks")
      .insert(
        breakInputs.map((b, i) => ({
          shift_id: shift.id,
          label: b.label,
          duration_minutes: b.duration_minutes,
          is_paid: b.is_paid,
          sort_order: i,
        }))
      );
    if (breakErr) return { error: breakErr.message };
  }

  // Insert tag assignments
  if (tag_ids?.length) {
    const { error: tagErr } = await supabase
      .from("shift_tag_assignments")
      .insert(tag_ids.map((tag_id) => ({ shift_id: shift.id, tag_id })));
    if (tagErr) return { error: tagErr.message };
  }

  // Generate recurring shifts
  if (recurrence) {
    const recurringShifts = generateRecurringShifts(
      shift,
      recurrence,
      user.id
    );
    if (recurringShifts.length > 0) {
      const { error: recErr } = await supabase
        .from("shifts")
        .insert(recurringShifts);
      if (recErr) return { error: recErr.message };

      // Copy breaks to recurring shifts
      if (breakInputs?.length && recurringShifts.length > 0) {
        const { data: insertedRecurring } = await supabase
          .from("shifts")
          .select("id")
          .eq("recurrence_group_id", recurrence_group_id!)
          .neq("id", shift.id);

        if (insertedRecurring?.length) {
          const allBreaks = insertedRecurring.flatMap(
            (rs: { id: string }) =>
              breakInputs.map((b, i) => ({
                shift_id: rs.id,
                label: b.label,
                duration_minutes: b.duration_minutes,
                is_paid: b.is_paid,
                sort_order: i,
              }))
          );
          await supabase.from("shift_breaks").insert(allBreaks);
        }
      }
    }
  }

  // Save as template
  if (save_as_template) {
    const startTimePart = new Date(shift.start_time)
      .toISOString()
      .split("T")[1]
      ?.slice(0, 5);
    const endTimePart = new Date(shift.end_time)
      .toISOString()
      .split("T")[1]
      ?.slice(0, 5);

    await supabase.from("shift_templates").insert({
      shop_id: data.shop_id,
      name: save_as_template.name,
      position_id: data.position_id || null,
      start_time: startTimePart ?? "08:00",
      end_time: endTimePart ?? "17:00",
      break_minutes: data.break_minutes ?? 0,
    });
  }

  revalidatePath("/schedule");
  return { data: shift };
}

function generateRecurringShifts(
  baseShift: {
    shop_id: string;
    schedule_id: string | null;
    user_id: string | null;
    position_id: string | null;
    start_time: string;
    end_time: string;
    break_minutes: number;
    is_open: boolean;
    notes: string | null;
    color: string | null;
    recurrence_group_id: string | null;
  },
  recurrence: RecurrenceInput,
  createdBy: string
) {
  const shifts: Array<{
    shop_id: string;
    schedule_id: string | null;
    user_id: string | null;
    position_id: string | null;
    start_time: string;
    end_time: string;
    break_minutes: number;
    is_open: boolean;
    notes: string | null;
    color: string | null;
    recurrence_group_id: string | null;
    created_by: string;
    status: "draft";
  }> = [];

  const baseStart = new Date(baseShift.start_time);
  const baseEnd = new Date(baseShift.end_time);
  const durationMs = baseEnd.getTime() - baseStart.getTime();
  const baseDay = baseStart.getUTCDay();

  // End date defaults to 2 years from now
  const maxDate =
    recurrence.endType === "on_date" && recurrence.endDate
      ? new Date(recurrence.endDate)
      : addWeeks(baseStart, 104);

  const weekStep = recurrence.frequency === "biweekly" ? 2 : 1;
  const MAX_SHIFTS = 104;

  // For each requested day, compute offset from base day
  for (const targetDay of recurrence.days) {
    let dayOffset = targetDay - baseDay;
    if (dayOffset <= 0) dayOffset += 7; // Skip same/past days in first week

    let currentStart = addDays(baseStart, dayOffset);

    while (currentStart <= maxDate && shifts.length < MAX_SHIFTS) {
      const currentEnd = new Date(currentStart.getTime() + durationMs);

      shifts.push({
        shop_id: baseShift.shop_id,
        schedule_id: baseShift.schedule_id,
        user_id: baseShift.user_id,
        position_id: baseShift.position_id,
        start_time: currentStart.toISOString(),
        end_time: currentEnd.toISOString(),
        break_minutes: baseShift.break_minutes,
        is_open: baseShift.is_open,
        notes: baseShift.notes,
        color: baseShift.color,
        recurrence_group_id: baseShift.recurrence_group_id,
        created_by: createdBy,
        status: "draft",
      });

      currentStart = addWeeks(currentStart, weekStep);
    }
  }

  return shifts;
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
    color?: string | null;
    status?: "draft" | "published";
    breaks?: BreakInput[];
    tag_ids?: string[];
  }
) {
  const supabase = await createClient();

  const { breaks: breakInputs, tag_ids, ...shiftData } = data;

  const { error } = await supabase
    .from("shifts")
    .update(shiftData)
    .eq("id", shiftId);

  if (error) return { error: error.message };

  // Replace breaks: delete all, then insert new
  if (breakInputs !== undefined) {
    await supabase.from("shift_breaks").delete().eq("shift_id", shiftId);

    if (breakInputs.length > 0) {
      const { error: breakErr } = await supabase
        .from("shift_breaks")
        .insert(
          breakInputs.map((b, i) => ({
            shift_id: shiftId,
            label: b.label,
            duration_minutes: b.duration_minutes,
            is_paid: b.is_paid,
            sort_order: i,
          }))
        );
      if (breakErr) return { error: breakErr.message };
    }
  }

  // Replace tag assignments: delete all, then insert new
  if (tag_ids !== undefined) {
    await supabase
      .from("shift_tag_assignments")
      .delete()
      .eq("shift_id", shiftId);

    if (tag_ids.length > 0) {
      const { error: tagErr } = await supabase
        .from("shift_tag_assignments")
        .insert(tag_ids.map((tag_id) => ({ shift_id: shiftId, tag_id })));
      if (tagErr) return { error: tagErr.message };
    }
  }

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

// --- New actions for dialog features ---

export async function getShiftBreaks(shiftId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shift_breaks")
    .select("*")
    .eq("shift_id", shiftId)
    .order("sort_order");

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function getShiftTagAssignments(shiftId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shift_tag_assignments")
    .select("tag_id, shift_tags(id, name)")
    .eq("shift_id", shiftId);

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function getShopTags(shopId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shift_tags")
    .select("*")
    .eq("shop_id", shopId)
    .order("name");

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function createShopTag(shopId: string, name: string) {
  const supabase = await createClient();

  // Try to insert, on conflict return existing
  const { data: existing } = await supabase
    .from("shift_tags")
    .select("*")
    .eq("shop_id", shopId)
    .eq("name", name)
    .maybeSingle();

  if (existing) return { data: existing };

  const { data, error } = await supabase
    .from("shift_tags")
    .insert({ shop_id: shopId, name })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function getShiftHistory(shiftId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shift_history")
    .select("*, profiles:changed_by(full_name)")
    .eq("shift_id", shiftId)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function copyWeekForward(data: {
  shop_id: string;
  source_week_start: string; // ISO date (Sunday)
  weeks_count: number; // 1–12
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  if (data.weeks_count < 1 || data.weeks_count > 12) {
    return { error: "Weeks count must be between 1 and 12" };
  }

  const weekStart = startOfWeek(new Date(data.source_week_start), {
    weekStartsOn: 0,
  });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });

  // Fetch source shifts
  const { data: sourceShifts, error: fetchErr } = await supabase
    .from("shifts")
    .select("*")
    .eq("shop_id", data.shop_id)
    .gte("start_time", weekStart.toISOString())
    .lte("start_time", weekEnd.toISOString());

  if (fetchErr) return { error: fetchErr.message };
  if (!sourceShifts?.length) return { error: "No shifts found in source week" };
  if (sourceShifts.length > 200) {
    return { error: "Source week has too many shifts (max 200)" };
  }

  // Build all new shifts across target weeks
  type NewShift = {
    shop_id: string;
    schedule_id: string | null;
    user_id: string | null;
    position_id: string | null;
    start_time: string;
    end_time: string;
    break_minutes: number;
    is_open: boolean;
    notes: string | null;
    color: string | null;
    status: "draft";
    created_by: string;
    _source_id: string;
  };
  const newShifts: NewShift[] = [];

  for (let w = 1; w <= data.weeks_count; w++) {
    for (const shift of sourceShifts) {
      newShifts.push({
        shop_id: shift.shop_id,
        schedule_id: shift.schedule_id,
        user_id: shift.user_id,
        position_id: shift.position_id,
        start_time: addWeeks(new Date(shift.start_time), w).toISOString(),
        end_time: addWeeks(new Date(shift.end_time), w).toISOString(),
        break_minutes: shift.break_minutes,
        is_open: shift.is_open,
        notes: shift.notes,
        color: shift.color,
        status: "draft",
        created_by: user.id,
        _source_id: shift.id,
      });
    }
  }

  // Insert shifts (strip _source_id before insert)
  const toInsert = newShifts.map(
    ({ _source_id: _, ...rest }) => rest
  );
  const { data: inserted, error: insertErr } = await supabase
    .from("shifts")
    .insert(toInsert)
    .select("id");

  if (insertErr) return { error: insertErr.message };
  if (!inserted?.length) return { error: "Failed to insert shifts" };

  // Map inserted IDs back to source IDs for breaks/tags
  const sourceIds = [...new Set(newShifts.map((s) => s._source_id))];

  const { data: sourceBreaks } = await supabase
    .from("shift_breaks")
    .select("*")
    .in("shift_id", sourceIds);

  const { data: sourceTags } = await supabase
    .from("shift_tag_assignments")
    .select("*")
    .in("shift_id", sourceIds);

  if (sourceBreaks?.length || sourceTags?.length) {
    const allBreaks: Array<{
      shift_id: string;
      label: string;
      duration_minutes: number;
      is_paid: boolean;
      sort_order: number;
    }> = [];
    const allTags: Array<{ shift_id: string; tag_id: string }> = [];

    for (let i = 0; i < inserted.length; i++) {
      const newShiftId = inserted[i].id;
      const sourceId = newShifts[i]._source_id;

      if (sourceBreaks?.length) {
        for (const brk of sourceBreaks.filter(
          (b: { shift_id: string }) => b.shift_id === sourceId
        )) {
          allBreaks.push({
            shift_id: newShiftId,
            label: brk.label,
            duration_minutes: brk.duration_minutes,
            is_paid: brk.is_paid,
            sort_order: brk.sort_order,
          });
        }
      }

      if (sourceTags?.length) {
        for (const tag of sourceTags.filter(
          (t: { shift_id: string }) => t.shift_id === sourceId
        )) {
          allTags.push({ shift_id: newShiftId, tag_id: tag.tag_id });
        }
      }
    }

    if (allBreaks.length) {
      await supabase.from("shift_breaks").insert(allBreaks);
    }
    if (allTags.length) {
      await supabase.from("shift_tag_assignments").insert(allTags);
    }
  }

  revalidatePath("/schedule");
  return { success: true, count: inserted.length };
}
