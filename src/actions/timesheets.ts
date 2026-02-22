"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updatePayPeriodSettings(data: {
  shop_id: string;
  week_start_day: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Read current settings, merge new pay period config
  const { data: shop } = await supabase
    .from("shops")
    .select("settings")
    .eq("id", data.shop_id)
    .single();

  const currentSettings = (shop?.settings as Record<string, unknown>) ?? {};
  const newSettings = {
    ...currentSettings,
    pay_period_type: "weekly",
    week_start_day: data.week_start_day,
  };

  const { error } = await supabase
    .from("shops")
    .update({ settings: newSettings })
    .eq("id", data.shop_id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}

export async function getTimesheetBreakdown(data: {
  shop_id: string;
  user_id: string;
  start_date: string;  // YYYY-MM-DD
  end_date: string;    // YYYY-MM-DD
  timezone?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: result, error } = await supabase.rpc("get_timesheet_daily_breakdown", {
    p_shop_id: data.shop_id,
    p_user_id: data.user_id,
    p_start_date: data.start_date,
    p_end_date: data.end_date,
    p_timezone: data.timezone ?? "America/New_York",
  });

  if (error) return { error: error.message };
  return { data: result };
}

export async function signTimesheet(data: {
  shop_id: string;
  period_start: string;
  period_end: string;
  signature_data: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.from("timesheet_signatures").insert({
    shop_id: data.shop_id,
    user_id: user.id,
    period_start: data.period_start,
    period_end: data.period_end,
    signature_data: data.signature_data,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function getTimesheetSignature(data: {
  shop_id: string;
  user_id: string;
  period_start: string;
  period_end: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: result, error } = await supabase
    .from("timesheet_signatures")
    .select("*")
    .eq("shop_id", data.shop_id)
    .eq("user_id", data.user_id)
    .eq("period_start", data.period_start)
    .eq("period_end", data.period_end)
    .maybeSingle();

  if (error) return { error: error.message };
  return { data: result };
}

export async function getTeamSignatures(data: {
  shop_id: string;
  period_start: string;
  period_end: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: result, error } = await supabase
    .from("timesheet_signatures")
    .select("*")
    .eq("shop_id", data.shop_id)
    .eq("period_start", data.period_start)
    .eq("period_end", data.period_end);

  if (error) return { error: error.message };
  return { data: result ?? [] };
}

export async function editTimesheetEntry(data: {
  shop_id: string;
  user_id: string;
  time_record_id: string;
  clock_in: string;
  clock_out: string;
  notes?: string;
  period_start: string;
  period_end: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Verify caller is admin
  const { data: membership } = await supabase
    .from("shop_members")
    .select("role")
    .eq("shop_id", data.shop_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || (membership.role !== "owner" && membership.role !== "manager")) {
    return { error: "Only managers can edit timesheets" };
  }

  // Fetch existing record for old_data snapshot
  const { data: existing, error: fetchError } = await supabase
    .from("time_records")
    .select("*")
    .eq("id", data.time_record_id)
    .single();

  if (fetchError || !existing) return { error: "Time record not found" };

  // Update the time record
  const { error: updateError } = await supabase
    .from("time_records")
    .update({
      clock_in: data.clock_in,
      clock_out: data.clock_out,
    })
    .eq("id", data.time_record_id);

  if (updateError) return { error: updateError.message };

  // Insert activity log
  await supabase.from("timesheet_activity_log").insert({
    time_record_id: data.time_record_id,
    shop_id: data.shop_id,
    user_id: data.user_id,
    action: "edit" as const,
    changed_by: user.id,
    old_data: { clock_in: existing.clock_in, clock_out: existing.clock_out },
    new_data: { clock_in: data.clock_in, clock_out: data.clock_out },
    notes: data.notes || null,
  });

  // Auto-invalidate signature if one exists for this period
  await supabase
    .from("timesheet_signatures")
    .delete()
    .eq("shop_id", data.shop_id)
    .eq("user_id", data.user_id)
    .eq("period_start", data.period_start)
    .eq("period_end", data.period_end);

  revalidatePath("/timesheets");
  return { success: true };
}

export async function addTimesheetEntry(data: {
  shop_id: string;
  user_id: string;
  clock_in: string;
  clock_out: string;
  notes?: string;
  period_start: string;
  period_end: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Verify caller is admin
  const { data: membership } = await supabase
    .from("shop_members")
    .select("role")
    .eq("shop_id", data.shop_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || (membership.role !== "owner" && membership.role !== "manager")) {
    return { error: "Only managers can add timesheet entries" };
  }

  // Create the time record
  const { data: newRecord, error: insertError } = await supabase
    .from("time_records")
    .insert({
      shop_id: data.shop_id,
      user_id: data.user_id,
      clock_in: data.clock_in,
      clock_out: data.clock_out,
      status: "clocked_out",
      is_manual: true,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertError) return { error: insertError.message };

  // Insert activity log
  await supabase.from("timesheet_activity_log").insert({
    time_record_id: newRecord.id,
    shop_id: data.shop_id,
    user_id: data.user_id,
    action: "create" as const,
    changed_by: user.id,
    old_data: null,
    new_data: { clock_in: data.clock_in, clock_out: data.clock_out },
    notes: data.notes || null,
  });

  // Auto-invalidate signature if one exists for this period
  await supabase
    .from("timesheet_signatures")
    .delete()
    .eq("shop_id", data.shop_id)
    .eq("user_id", data.user_id)
    .eq("period_start", data.period_start)
    .eq("period_end", data.period_end);

  revalidatePath("/timesheets");
  return { success: true };
}

export async function getTimesheetActivityLog(data: {
  shop_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: result, error } = await supabase.rpc("get_timesheet_activity_log", {
    p_shop_id: data.shop_id,
    p_user_id: data.user_id,
    p_start_date: data.start_date,
    p_end_date: data.end_date,
  });

  if (error) return { error: error.message };
  return { data: result };
}
