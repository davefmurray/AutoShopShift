"use client";

import { useState } from "react";
import { startOfWeek, endOfWeek } from "date-fns";
import { useUser } from "@/hooks/use-user";
import { useShopStore } from "@/stores/shop-store";
import {
  useTeamWorkforceSummary,
  type TeamMemberMetrics,
} from "@/hooks/use-reports";
import { DateRangePicker } from "@/components/reports/date-range-picker";
import { MetricsCards } from "@/components/reports/metrics-cards";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function ReportsPage() {
  const shopId = useShopStore((s) => s.activeShopId);
  const { data: currentUser } = useUser(shopId ?? undefined);

  const now = new Date();
  const [startDate, setStartDate] = useState(
    startOfWeek(now, { weekStartsOn: 1 }).toISOString()
  );
  const [endDate, setEndDate] = useState(
    endOfWeek(now, { weekStartsOn: 1 }).toISOString()
  );

  const { data: teamMetrics = [], isLoading } = useTeamWorkforceSummary(
    startDate,
    endDate
  );

  const isAdmin =
    currentUser?.role === "owner" || currentUser?.role === "manager";

  if (!isAdmin) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        Reports are only available to managers and owners.
      </div>
    );
  }

  const totals = teamMetrics.reduce(
    (acc, m) => ({
      hours: acc.hours + (m.hours_worked ?? 0),
      overtime: acc.overtime + (m.overtime_hours ?? 0),
      late: acc.late + (m.late_count ?? 0),
      cost: acc.cost + (m.labor_cost ?? 0),
    }),
    { hours: 0, overtime: 0, late: 0, cost: 0 }
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onRangeChange={(s, e) => {
          setStartDate(s);
          setEndDate(e);
        }}
      />

      <MetricsCards
        items={[
          {
            label: "Total Hours",
            value: totals.hours.toFixed(1),
            sublabel: "across team",
          },
          {
            label: "Overtime",
            value: totals.overtime.toFixed(1),
            sublabel: "hours",
          },
          { label: "Late Arrivals", value: totals.late },
          {
            label: "Labor Cost",
            value: `$${totals.cost.toFixed(2)}`,
          },
        ]}
      />

      {isLoading ? (
        <div className="text-muted-foreground py-8 text-center">
          Loading team metrics...
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium text-right">Hours</th>
                  <th className="p-3 font-medium text-right">OT</th>
                  <th className="p-3 font-medium text-right">Late</th>
                  <th className="p-3 font-medium text-right">Early</th>
                  <th className="p-3 font-medium text-right">Missed</th>
                  <th className="p-3 font-medium text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {teamMetrics.map((m: TeamMemberMetrics) => (
                  <tr key={m.user_id} className="border-b last:border-0">
                    <td className="p-3 font-medium">
                      <Link
                        href={`/reports/${m.member_id}`}
                        className="hover:underline"
                      >
                        {m.full_name ?? "Unknown"}
                      </Link>
                    </td>
                    <td className="p-3 text-right">{m.hours_worked}</td>
                    <td className="p-3 text-right">{m.overtime_hours}</td>
                    <td className="p-3 text-right">{m.late_count}</td>
                    <td className="p-3 text-right">{m.early_count}</td>
                    <td className="p-3 text-right">{m.missed_count}</td>
                    <td className="p-3 text-right">
                      ${(m.labor_cost ?? 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {teamMetrics.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-muted-foreground"
                    >
                      No data for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
