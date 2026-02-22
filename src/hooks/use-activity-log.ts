"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useShopStore } from "@/stores/shop-store";
import type { ActivityLogEntry } from "@/types/activity-log";

export function useActivityLog(filters: {
  entityType?: string;
  actorId?: string;
  limit?: number;
  offset?: number;
}) {
  const shopId = useShopStore((s) => s.activeShopId);

  return useQuery({
    queryKey: [
      "activity-log",
      shopId,
      filters.entityType,
      filters.actorId,
      filters.limit,
      filters.offset,
    ],
    queryFn: async (): Promise<ActivityLogEntry[]> => {
      if (!shopId) return [];
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_activity_log", {
        p_shop_id: shopId,
        p_entity_type: filters.entityType ?? null,
        p_actor_id: filters.actorId ?? null,
        p_limit: filters.limit ?? 50,
        p_offset: filters.offset ?? 0,
      });
      if (error) return [];
      return (data as unknown as ActivityLogEntry[]) ?? [];
    },
    enabled: !!shopId,
  });
}
