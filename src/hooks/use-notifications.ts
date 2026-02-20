"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useShopStore } from "@/stores/shop-store";

export type Notification = {
  id: string;
  shop_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
};

export function useNotifications() {
  const shopId = useShopStore((s) => s.activeShopId);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", shopId],
    queryFn: async (): Promise<Notification[]> => {
      if (!shopId) return [];
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("shop_id", shopId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      return (data as Notification[]) ?? [];
    },
    enabled: !!shopId,
  });

  // Realtime subscription for instant notification delivery
  useEffect(() => {
    if (!shopId) return;

    const supabase = createClient();
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `shop_id=eq.${shopId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["notifications", shopId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, queryClient]);

  const unreadCount = query.data?.filter((n) => !n.is_read).length ?? 0;

  return { ...query, unreadCount };
}
