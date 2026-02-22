"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useShopStore } from "@/stores/shop-store";
import type { TimesheetActivityEntry, TimesheetDayRow, TimesheetSignature, TimesheetSummary } from "@/types/timesheets";
import { getPayPeriodSettings } from "@/lib/pay-period";

export function useTimesheetBreakdown(
  userId: string | undefined,
  startDate: string,
  endDate: string,
  timezone?: string
) {
  const shopId = useShopStore((s) => s.activeShopId);

  return useQuery({
    queryKey: ["timesheet-breakdown", shopId, userId, startDate, endDate],
    queryFn: async (): Promise<TimesheetDayRow[]> => {
      if (!shopId || !userId) return [];
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_timesheet_daily_breakdown", {
        p_shop_id: shopId,
        p_user_id: userId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_timezone: timezone ?? "America/New_York",
      });
      if (error) return [];
      return (data as unknown as TimesheetDayRow[]) ?? [];
    },
    enabled: !!shopId && !!userId && !!startDate && !!endDate,
  });
}

export function useTimesheetSignature(
  userId: string | undefined,
  periodStart: string,
  periodEnd: string
) {
  const shopId = useShopStore((s) => s.activeShopId);

  return useQuery({
    queryKey: ["timesheet-signature", shopId, userId, periodStart, periodEnd],
    queryFn: async (): Promise<TimesheetSignature | null> => {
      if (!shopId || !userId) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from("timesheet_signatures")
        .select("*")
        .eq("shop_id", shopId)
        .eq("user_id", userId)
        .eq("period_start", periodStart)
        .eq("period_end", periodEnd)
        .maybeSingle();
      if (error) return null;
      return data as unknown as TimesheetSignature | null;
    },
    enabled: !!shopId && !!userId && !!periodStart && !!periodEnd,
  });
}

export function useTeamSignatures(periodStart: string, periodEnd: string) {
  const shopId = useShopStore((s) => s.activeShopId);

  return useQuery({
    queryKey: ["team-signatures", shopId, periodStart, periodEnd],
    queryFn: async (): Promise<TimesheetSignature[]> => {
      if (!shopId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("timesheet_signatures")
        .select("*")
        .eq("shop_id", shopId)
        .eq("period_start", periodStart)
        .eq("period_end", periodEnd);
      if (error) return [];
      return (data as unknown as TimesheetSignature[]) ?? [];
    },
    enabled: !!shopId && !!periodStart && !!periodEnd,
  });
}

export function usePayPeriodSettings() {
  const shopId = useShopStore((s) => s.activeShopId);

  return useQuery({
    queryKey: ["pay-period-settings", shopId],
    queryFn: async () => {
      if (!shopId) return getPayPeriodSettings(null);
      const supabase = createClient();
      const { data } = await supabase
        .from("shops")
        .select("settings")
        .eq("id", shopId)
        .single();
      return getPayPeriodSettings((data?.settings as Record<string, unknown>) ?? null);
    },
    enabled: !!shopId,
  });
}

export function useTimesheetActivityLog(
  userId: string | undefined,
  startDate: string,
  endDate: string
) {
  const shopId = useShopStore((s) => s.activeShopId);

  return useQuery({
    queryKey: ["timesheet-activity-log", shopId, userId, startDate, endDate],
    queryFn: async (): Promise<TimesheetActivityEntry[]> => {
      if (!shopId || !userId) return [];
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_timesheet_activity_log", {
        p_shop_id: shopId,
        p_user_id: userId,
        p_start_date: startDate,
        p_end_date: endDate,
      });
      if (error) return [];
      return (data as unknown as TimesheetActivityEntry[]) ?? [];
    },
    enabled: !!shopId && !!userId && !!startDate && !!endDate,
  });
}

export function computeTimesheetSummary(
  rows: TimesheetDayRow[],
  maxHoursPerWeek: number = 40
): TimesheetSummary {
  const worked = rows.reduce((sum, r) => sum + r.total_worked_hours, 0);
  const scheduled = rows.reduce((sum, r) => sum + r.scheduled_hours, 0);
  const timeOff = rows
    .filter((r) => r.is_time_off && r.is_paid_time_off)
    .reduce((sum, r) => sum + r.time_off_hours, 0);
  const overtime = Math.max(0, worked - maxHoursPerWeek);
  const regular = worked - overtime;

  return {
    regular_hours: Math.round(regular * 100) / 100,
    overtime_hours: Math.round(overtime * 100) / 100,
    time_off_hours: Math.round(timeOff * 100) / 100,
    paid_total_hours: Math.round((regular + overtime + timeOff) * 100) / 100,
    scheduled_hours: Math.round(scheduled * 100) / 100,
    worked_hours: Math.round(worked * 100) / 100,
    difference: Math.round((worked - scheduled) * 100) / 100,
  };
}
