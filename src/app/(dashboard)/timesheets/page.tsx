"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useShopStore } from "@/stores/shop-store";
import { useUser } from "@/hooks/use-user";
import {
  usePayPeriodSettings,
  useTimesheetBreakdown,
  useTimesheetSignature,
  useTeamSignatures,
  computeTimesheetSummary,
} from "@/hooks/use-timesheets";
import {
  getCurrentPayPeriod,
  navigatePayPeriod,
} from "@/lib/pay-period";
import { useShopTimezone } from "@/hooks/use-shop-timezone";
import { PayPeriodNavigator } from "@/components/timesheets/pay-period-navigator";
import { TimesheetTable } from "@/components/timesheets/timesheet-table";
import {
  TeamTimesheetList,
  type TeamTimesheetMember,
} from "@/components/timesheets/team-timesheet-list";

export default function TimesheetsPage() {
  const shopId = useShopStore((s) => s.activeShopId);
  const { data: currentUser } = useUser(shopId ?? undefined);
  const { data: paySettings } = usePayPeriodSettings();
  const timezone = useShopTimezone();

  const weekStartDay = paySettings?.week_start_day ?? 1;
  const [currentPeriod, setCurrentPeriod] = useState(() =>
    getCurrentPayPeriod(weekStartDay)
  );

  const periodStart = format(currentPeriod.start, "yyyy-MM-dd");
  const periodEnd = format(currentPeriod.end, "yyyy-MM-dd");

  const isAdmin =
    currentUser?.role === "owner" || currentUser?.role === "manager";

  function handleNavigate(direction: "prev" | "next") {
    setCurrentPeriod((prev) => navigatePayPeriod(prev, direction, weekStartDay));
  }

  // Manager view: fetch team summary
  const { data: teamMetrics = [], isLoading: teamLoading } = useQuery({
    queryKey: ["team-workforce-summary", shopId, periodStart, periodEnd],
    queryFn: async (): Promise<TeamTimesheetMember[]> => {
      if (!shopId) return [];
      const supabase = createClient();
      const { data, error } = await supabase.rpc(
        "get_team_workforce_summary",
        {
          p_shop_id: shopId,
          p_start_date: periodStart,
          p_end_date: periodEnd,
        }
      );
      if (error) return [];
      return (data as unknown as TeamTimesheetMember[]) ?? [];
    },
    enabled: !!shopId && isAdmin,
  });

  const { data: teamSignatures = [] } = useTeamSignatures(
    periodStart,
    periodEnd
  );

  // Technician view: own timesheet
  const { data: ownRows = [], isLoading: ownLoading } = useTimesheetBreakdown(
    !isAdmin ? currentUser?.id : undefined,
    periodStart,
    periodEnd,
    timezone
  );

  const ownSummary = computeTimesheetSummary(ownRows);

  const { data: ownSignature } = useTimesheetSignature(
    !isAdmin ? currentUser?.id : undefined,
    periodStart,
    periodEnd
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Timesheets</h1>

      <PayPeriodNavigator
        start={currentPeriod.start}
        end={currentPeriod.end}
        onNavigate={handleNavigate}
      />

      {isAdmin ? (
        teamLoading ? (
          <div className="text-muted-foreground py-8 text-center">
            Loading team timesheets...
          </div>
        ) : (
          <TeamTimesheetList
            members={teamMetrics.map((m) => ({
              member_id: m.member_id,
              user_id: m.user_id,
              full_name: m.full_name,
              hours_worked: m.hours_worked ?? 0,
              overtime_hours: m.overtime_hours ?? 0,
              time_off_hours: m.time_off_hours ?? 0,
            }))}
            periodStart={periodStart}
            periodEnd={periodEnd}
            signatures={teamSignatures}
          />
        )
      ) : ownLoading ? (
        <div className="text-muted-foreground py-8 text-center">
          Loading your timesheet...
        </div>
      ) : (
        <TimesheetTable
          employeeName={
            currentUser?.profile?.full_name ?? "My Timesheet"
          }
          rows={ownRows}
          summary={ownSummary}
          signature={ownSignature}
        />
      )}
    </div>
  );
}
