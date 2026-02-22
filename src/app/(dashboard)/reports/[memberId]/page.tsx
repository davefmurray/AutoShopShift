"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { startOfWeek, endOfWeek } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useShopStore } from "@/stores/shop-store";
import { useWorkforceMetrics } from "@/hooks/use-reports";
import { DateRangePicker } from "@/components/reports/date-range-picker";
import { MetricsCards } from "@/components/reports/metrics-cards";
import { PtoLedger } from "@/components/time-off/pto-ledger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function MemberReportPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const shopId = useShopStore((s) => s.activeShopId);

  const now = new Date();
  const [startDate, setStartDate] = useState(
    startOfWeek(now, { weekStartsOn: 1 }).toISOString()
  );
  const [endDate, setEndDate] = useState(
    endOfWeek(now, { weekStartsOn: 1 }).toISOString()
  );

  // Resolve memberId (shop_members.id) to user_id + profile
  const { data: member, isLoading: memberLoading } = useQuery({
    queryKey: ["report-member", memberId],
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
        role: (sm as { role: string }).role,
        hourly_rate: (sm as { hourly_rate: number | null }).hourly_rate,
        full_name:
          (profile as { full_name: string | null } | null)?.full_name ??
          "Team Member",
      };
    },
    enabled: !!memberId,
  });

  const { data: metrics, isLoading: metricsLoading } = useWorkforceMetrics(
    member?.user_id,
    startDate,
    endDate
  );

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
          <Link href="/reports">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{member.full_name}</h1>
      </div>

      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onRangeChange={(s, e) => {
          setStartDate(s);
          setEndDate(e);
        }}
      />

      {metricsLoading ? (
        <div className="text-muted-foreground py-8 text-center">
          Loading metrics...
        </div>
      ) : metrics ? (
        <>
          <MetricsCards
            items={[
              {
                label: "Hours Worked",
                value: metrics.total_hours_worked,
                sublabel: `${metrics.avg_hours_per_day} avg/day`,
              },
              {
                label: "Overtime",
                value: metrics.overtime_hours,
                sublabel: "hours",
              },
              { label: "Late Arrivals", value: metrics.late_arrivals },
              {
                label: "Labor Cost",
                value: `$${metrics.labor_cost.toFixed(2)}`,
              },
            ]}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Shifts Scheduled</span>
                  <p className="text-lg font-semibold">{metrics.total_shifts}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Shifts Worked</span>
                  <p className="text-lg font-semibold">{metrics.shifts_worked}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Missed</span>
                  <p className="text-lg font-semibold">{metrics.missed_shifts}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Early Departures</span>
                  <p className="text-lg font-semibold">
                    {metrics.early_departures}
                  </p>
                </div>
              </div>
              {metrics.total_shifts > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Attendance rate:{" "}
                  {(
                    (metrics.shifts_worked / metrics.total_shifts) *
                    100
                  ).toFixed(0)}
                  %
                </p>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      <div>
        <h2 className="text-lg font-semibold mb-3">PTO Ledger</h2>
        <PtoLedger userId={member.user_id} />
      </div>
    </div>
  );
}
