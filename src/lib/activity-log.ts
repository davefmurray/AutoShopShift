import { SupabaseClient } from "@supabase/supabase-js";

export async function logActivity(
  supabase: SupabaseClient,
  params: {
    shop_id: string;
    entity_type: string;
    entity_id?: string;
    action: string;
    actor_id: string;
    target_user_id?: string;
    description: string;
    metadata?: Record<string, unknown>;
  }
) {
  await supabase.from("activity_log").insert(params);
}
