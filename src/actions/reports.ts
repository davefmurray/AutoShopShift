"use server";

import { createClient } from "@/lib/supabase/server";

export async function getWorkforceMetrics(data: {
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

  const { data: result, error } = await supabase.rpc("get_workforce_metrics", {
    p_shop_id: data.shop_id,
    p_user_id: data.user_id,
    p_start_date: data.start_date,
    p_end_date: data.end_date,
  });

  if (error) return { error: error.message };
  return { data: result };
}

export async function getTeamWorkforceSummary(data: {
  shop_id: string;
  start_date: string;
  end_date: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: result, error } = await supabase.rpc(
    "get_team_workforce_summary",
    {
      p_shop_id: data.shop_id,
      p_start_date: data.start_date,
      p_end_date: data.end_date,
    }
  );

  if (error) return { error: error.message };
  return { data: result };
}

export async function getPtoLedger(data: {
  shop_id: string;
  user_id: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: result, error } = await supabase.rpc("get_pto_ledger", {
    p_shop_id: data.shop_id,
    p_user_id: data.user_id,
  });

  if (error) return { error: error.message };
  return { data: result };
}
