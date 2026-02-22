"use server";

import { createClient } from "@/lib/supabase/server";

export async function getActivityLog(data: {
  shop_id: string;
  entity_type?: string;
  actor_id?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: result, error } = await supabase.rpc("get_activity_log", {
    p_shop_id: data.shop_id,
    p_entity_type: data.entity_type ?? null,
    p_actor_id: data.actor_id ?? null,
    p_limit: data.limit ?? 50,
    p_offset: data.offset ?? 0,
  });

  if (error) return { error: error.message };
  return { data: result };
}
