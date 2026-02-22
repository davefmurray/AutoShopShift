"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useShopStore } from "@/stores/shop-store";
import { useUser } from "@/hooks/use-user";

export type WorkforceMetrics = {
  total_shifts: number;
  shifts_worked: number;
  missed_shifts: number;
  total_hours_worked: number;
  total_break_minutes: number;
  late_arrivals: number;
  early_departures: number;
  overtime_hours: number;
  labor_cost: number;
  avg_hours_per_day: number;
};

export type TeamMemberMetrics = {
  user_id: string;
  member_id: string;
  full_name: string | null;
  role: string;
  department: string | null;
  hours_worked: number;
  overtime_hours: number;
  late_count: number;
  early_count: number;
  missed_count: number;
  labor_cost: number;
};

export type PtoLedgerEntry = {
  date: string;
  type: "accrual" | "usage" | "adjustment" | "pending";
  hours: number;
  description: string;
  balance_after: number;
  reference_id: string | null;
};

export function useWorkforceMetrics(
  userId: string | undefined,
  startDate: string,
  endDate: string
) {
  const shopId = useShopStore((s) => s.activeShopId);
  const { data: currentUser } = useUser();
  const targetUserId = userId ?? currentUser?.id;

  return useQuery({
    queryKey: ["workforce-metrics", shopId, targetUserId, startDate, endDate],
    queryFn: async (): Promise<WorkforceMetrics> => {
      const defaults: WorkforceMetrics = {
        total_shifts: 0,
        shifts_worked: 0,
        missed_shifts: 0,
        total_hours_worked: 0,
        total_break_minutes: 0,
        late_arrivals: 0,
        early_departures: 0,
        overtime_hours: 0,
        labor_cost: 0,
        avg_hours_per_day: 0,
      };
      if (!shopId || !targetUserId) return defaults;
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_workforce_metrics", {
        p_shop_id: shopId,
        p_user_id: targetUserId,
        p_start_date: startDate,
        p_end_date: endDate,
      });
      if (error) return defaults;
      return data as unknown as WorkforceMetrics;
    },
    enabled: !!shopId && !!targetUserId && !!startDate && !!endDate,
  });
}

export function useTeamWorkforceSummary(startDate: string, endDate: string) {
  const shopId = useShopStore((s) => s.activeShopId);

  return useQuery({
    queryKey: ["team-workforce-summary", shopId, startDate, endDate],
    queryFn: async (): Promise<TeamMemberMetrics[]> => {
      if (!shopId) return [];
      const supabase = createClient();
      const { data, error } = await supabase.rpc(
        "get_team_workforce_summary",
        {
          p_shop_id: shopId,
          p_start_date: startDate,
          p_end_date: endDate,
        }
      );
      if (error) return [];
      return data as unknown as TeamMemberMetrics[];
    },
    enabled: !!shopId && !!startDate && !!endDate,
  });
}

export function usePtoLedger(userId?: string) {
  const shopId = useShopStore((s) => s.activeShopId);
  const { data: currentUser } = useUser();
  const targetUserId = userId ?? currentUser?.id;

  return useQuery({
    queryKey: ["pto-ledger", shopId, targetUserId],
    queryFn: async (): Promise<PtoLedgerEntry[]> => {
      if (!shopId || !targetUserId) return [];
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_pto_ledger", {
        p_shop_id: shopId,
        p_user_id: targetUserId,
      });
      if (error) return [];
      return data as unknown as PtoLedgerEntry[];
    },
    enabled: !!shopId && !!targetUserId,
  });
}
