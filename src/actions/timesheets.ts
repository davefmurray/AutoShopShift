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
