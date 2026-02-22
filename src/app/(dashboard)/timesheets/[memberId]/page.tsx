"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, PenLine } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useShopStore } from "@/stores/shop-store";
import { useUser } from "@/hooks/use-user";
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
import { SignTimesheetDialog } from "@/components/timesheets/sign-timesheet-dialog";
import { ExportButtons } from "@/components/timesheets/export-buttons";

export default function MemberTimesheetPage() {
  const { memberId } = useParams<{ memberId: string }>();
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

  const { data: shop } = useQuery({
    queryKey: ["shop-name", shopId],
    queryFn: async () => {
      if (!shopId) return null;
      const supabase = createClient();
      const { data } = await supabase.from("shops").select("name").eq("id", shopId).single();
      return data as { name: string } | null;
    },
    enabled: !!shopId,
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

  const isOwnTimesheet = currentUser?.id === member.user_id;
  const canSign = isOwnTimesheet && !signature;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/timesheets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{member.full_name}</h1>
        <div className="ml-auto flex items-center gap-2">
          {rows.length > 0 && (
            <ExportButtons
              shopName={shop?.name ?? "Shop"}
              employeeName={member.full_name}
              periodStart={periodStart}
              periodEnd={periodEnd}
              rows={rows}
              summary={summary}
              signature={signature}
            />
          )}
          {canSign && (
            <SignTimesheetDialog
              periodStart={periodStart}
              periodEnd={periodEnd}
              summary={summary}
            >
              <Button size="sm">
                <PenLine className="mr-2 h-4 w-4" />
                Sign Timesheet
              </Button>
            </SignTimesheetDialog>
          )}
        </div>
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
