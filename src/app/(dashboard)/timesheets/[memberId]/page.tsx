"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  usePayPeriodSettings,
  useTimesheetBreakdown,
  useTimesheetSignature,
  computeTimesheetSummary,
} from "@/hooks/use-timesheets";
import {
  getCurrentPayPeriod,
  navigatePayPeriod,
} from "@/lib/pay-period";
import { useShopTimezone } from "@/hooks/use-shop-timezone";
import { PayPeriodNavigator } from "@/components/timesheets/pay-period-navigator";
import { TimesheetTable } from "@/components/timesheets/timesheet-table";

export default function MemberTimesheetPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const { data: paySettings } = usePayPeriodSettings();
  const timezone = useShopTimezone();

  const weekStartDay = paySettings?.week_start_day ?? 1;
  const [currentPeriod, setCurrentPeriod] = useState(() =>
    getCurrentPayPeriod(weekStartDay)
  );

  const periodStart = format(currentPeriod.start, "yyyy-MM-dd");
  const periodEnd = format(currentPeriod.end, "yyyy-MM-dd");

  // Resolve memberId (shop_members.id) to user_id + profile
  const { data: member, isLoading: memberLoading } = useQuery({
    queryKey: ["timesheet-member", memberId],
    queryFn: async () => {
      const supabase = createClient();
      const { data: sm } = await supabase
        .from("shop_members")
        .select("user_id, role, hourly_rate")
        .eq("id", memberId)
        .single();
      if (!sm) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", (sm as { user_id: string }).user_id)
        .single();
      return {
        user_id: (sm as { user_id: string }).user_id,
        full_name:
          (profile as { full_name: string | null } | null)?.full_name ??
          "Team Member",
      };
    },
    enabled: !!memberId,
  });

  const { data: rows = [], isLoading: rowsLoading } = useTimesheetBreakdown(
    member?.user_id,
    periodStart,
    periodEnd,
    timezone
  );

  const summary = computeTimesheetSummary(rows);

  const { data: signature } = useTimesheetSignature(
    member?.user_id,
    periodStart,
    periodEnd
  );

  function handleNavigate(direction: "prev" | "next") {
    setCurrentPeriod((prev) => navigatePayPeriod(prev, direction, weekStartDay));
  }

  if (memberLoading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  if (!member) {
    return <div className="text-muted-foreground">Member not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/timesheets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{member.full_name}</h1>
      </div>

      <PayPeriodNavigator
        start={currentPeriod.start}
        end={currentPeriod.end}
        onNavigate={handleNavigate}
      />

      {rowsLoading ? (
        <div className="text-muted-foreground py-8 text-center">
          Loading timesheet...
        </div>
      ) : (
        <TimesheetTable
          employeeName={member.full_name}
          rows={rows}
          summary={summary}
          signature={signature}
        />
      )}
    </div>
  );
}
