"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useShopStore } from "@/stores/shop-store";

export type Shift = {
  id: string;
  shop_id: string;
  schedule_id: string | null;
  user_id: string | null;
  position_id: string | null;
  start_time: string;
  end_time: string;
  break_minutes: number;
  status: "draft" | "published";
  is_open: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export function useShifts(startDate: string, endDate: string) {
  const shopId = useShopStore((s) => s.activeShopId);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["shifts", shopId, startDate, endDate],
    queryFn: async (): Promise<Shift[]> => {
      if (!shopId) return [];
      const supabase = createClient();
      const { data } = await supabase
        .from("shifts")
        .select("*")
        .eq("shop_id", shopId)
        .gte("start_time", startDate)
        .lte("start_time", endDate)
        .order("start_time");
      return (data as Shift[]) ?? [];
    },
    enabled: !!shopId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!shopId) return;

    const supabase = createClient();
    const channel = supabase
      .channel("shifts-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shifts",
          filter: `shop_id=eq.${shopId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["shifts", shopId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, queryClient]);

  return query;
}

export function useMembers() {
  const shopId = useShopStore((s) => s.activeShopId);

  return useQuery({
    queryKey: ["members-list", shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const supabase = createClient();

      const { data: members } = await supabase
        .from("shop_members")
        .select("*")
        .eq("shop_id", shopId)
        .eq("is_active", true);

      if (!members?.length) return [];

      const userIds = members.map((m: { user_id: string }) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      return members.map((m: { user_id: string; id: string; role: string }) => ({
        ...m,
        profile: (profiles ?? []).find((p: { id: string }) => p.id === m.user_id),
      }));
    },
    enabled: !!shopId,
  });
}

export function usePositions() {
  const shopId = useShopStore((s) => s.activeShopId);

  return useQuery({
    queryKey: ["positions-list", shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const supabase = createClient();
      const { data } = await supabase
        .from("positions")
        .select("*")
        .eq("shop_id", shopId)
        .order("sort_order");
      return data ?? [];
    },
    enabled: !!shopId,
  });
}

export function useSchedules() {
  const shopId = useShopStore((s) => s.activeShopId);

  return useQuery({
    queryKey: ["schedules-list", shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const supabase = createClient();
      const { data } = await supabase
        .from("schedules")
        .select("*")
        .eq("shop_id", shopId);
      return data ?? [];
    },
    enabled: !!shopId,
  });
}
