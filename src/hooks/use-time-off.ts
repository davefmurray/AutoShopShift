"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useShopStore } from "@/stores/shop-store";
import { useUser } from "@/hooks/use-user";

export type TimeOffRequest = {
  id: string;
  shop_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  hours_requested: number;
  reason: string | null;
  is_paid: boolean | null;
  status: "pending" | "approved" | "denied" | "cancelled";
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
  profile?: { full_name: string | null };
};

export type PtoBalance = {
  hours_accrued: number;
  hours_used: number;
  hours_pending: number;
  hours_available: number;
};

export type Department = {
  id: string;
  shop_id: string;
  name: string;
  pto_accrual_rate: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export function useTimeOffRequests() {
  const shopId = useShopStore((s) => s.activeShopId);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["time-off-requests", shopId],
    queryFn: async (): Promise<TimeOffRequest[]> => {
      if (!shopId) return [];
      const supabase = createClient();
      const { data: requests } = await supabase
        .from("time_off_requests")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });

      if (!requests?.length) return [];

      // Enrich with profile names
      const userIds = [...new Set(requests.map((r: { user_id: string }) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      return requests.map((r: { user_id: string }) => ({
        ...r,
        profile: (profiles ?? []).find((p: { id: string }) => p.id === r.user_id),
      })) as TimeOffRequest[];
    },
    enabled: !!shopId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!shopId) return;

    const supabase = createClient();
    const channel = supabase
      .channel("time-off-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "time_off_requests",
          filter: `shop_id=eq.${shopId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["time-off-requests", shopId],
          });
          // Also invalidate balances since they depend on requests
          queryClient.invalidateQueries({
            queryKey: ["pto-balance"],
          });
          queryClient.invalidateQueries({
            queryKey: ["team-pto-balances"],
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

export function usePtoBalance(userId?: string) {
  const shopId = useShopStore((s) => s.activeShopId);
  const { data: currentUser } = useUser();
  const targetUserId = userId ?? currentUser?.id;

  return useQuery({
    queryKey: ["pto-balance", shopId, targetUserId],
    queryFn: async (): Promise<PtoBalance> => {
      if (!shopId || !targetUserId)
        return { hours_accrued: 0, hours_used: 0, hours_pending: 0, hours_available: 0 };
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_pto_balance", {
        p_shop_id: shopId,
        p_user_id: targetUserId,
      });
      if (error) return { hours_accrued: 0, hours_used: 0, hours_pending: 0, hours_available: 0 };
      return data as unknown as PtoBalance;
    },
    enabled: !!shopId && !!targetUserId,
  });
}

export function useTeamPtoBalances() {
  const shopId = useShopStore((s) => s.activeShopId);

  return useQuery({
    queryKey: ["team-pto-balances", shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const supabase = createClient();

      // Get all active members
      const { data: members } = await supabase
        .from("shop_members")
        .select("user_id")
        .eq("shop_id", shopId)
        .eq("is_active", true);

      if (!members?.length) return [];

      const userIds = members.map((m: { user_id: string }) => m.user_id);

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      // Get balances for each member
      const balances = await Promise.all(
        userIds.map(async (userId: string) => {
          const { data } = await supabase.rpc("get_pto_balance", {
            p_shop_id: shopId,
            p_user_id: userId,
          });
          const profile = (profiles ?? []).find((p: { id: string }) => p.id === userId);
          return {
            user_id: userId,
            full_name: (profile as { full_name: string | null } | undefined)?.full_name ?? "Unknown",
            ...(data as unknown as PtoBalance),
          };
        })
      );

      return balances;
    },
    enabled: !!shopId,
  });
}

export function useDepartments() {
  const shopId = useShopStore((s) => s.activeShopId);

  return useQuery({
    queryKey: ["departments", shopId],
    queryFn: async (): Promise<Department[]> => {
      if (!shopId) return [];
      const supabase = createClient();
      const { data } = await supabase
        .from("departments")
        .select("*")
        .eq("shop_id", shopId)
        .order("sort_order");
      return (data as Department[]) ?? [];
    },
    enabled: !!shopId,
  });
}
