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
