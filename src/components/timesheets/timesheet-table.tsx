"use client";

import { format } from "date-fns";
import { CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type {
  TimesheetDayRow,
  TimesheetSummary,
  TimesheetSignature,
} from "@/types/timesheets";

type TimesheetTableProps = {
  employeeName: string;
  rows: TimesheetDayRow[];
  summary: TimesheetSummary;
  signature?: TimesheetSignature | null;
};

function formatHours(h: number): string {
  if (h === 0) return "0h";
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatDifference(diff: number): {
  text: string;
  className: string;
} {
  if (diff === 0) return { text: "0h", className: "text-muted-foreground" };
  const sign = diff > 0 ? "+" : "";
  return {
    text: `${sign}${formatHours(Math.abs(diff))}`,
    className: diff > 0 ? "text-green-600" : "text-red-600",
  };
}

export function TimesheetTable({
  employeeName,
  rows,
  summary,
  signature,
}: TimesheetTableProps) {
  const totalWorked = rows.reduce((sum, r) => sum + r.total_worked_hours, 0);
  const totalScheduled = rows.reduce((sum, r) => sum + r.scheduled_hours, 0);
  const totalDiff = totalWorked - totalScheduled;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{employeeName}</h2>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Regular</p>
          <p className="text-lg font-bold">{formatHours(summary.regular_hours)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Overtime</p>
          <p className="text-lg font-bold">{formatHours(summary.overtime_hours)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Time Off</p>
          <p className="text-lg font-bold">{formatHours(summary.time_off_hours)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Paid Total</p>
          <p className="text-lg font-bold">
            {formatHours(summary.paid_total_hours)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Sched vs Worked</p>
          <p className={`text-lg font-bold ${formatDifference(summary.difference).className}`}>
            {formatDifference(summary.difference).text}
          </p>
        </div>
      </div>

      {/* Daily table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3 font-medium">Day</th>
                  <th className="p-3 font-medium">In</th>
                  <th className="p-3 font-medium">Out</th>
                  <th className="p-3 font-medium">Total</th>
                  <th className="p-3 font-medium">Details</th>
                  <th className="p-3 font-medium text-right">Worked</th>
                  <th className="p-3 font-medium text-right">Scheduled</th>
                  <th className="p-3 font-medium text-right">Difference</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const dayLabel = format(
                    new Date(row.day_date + "T00:00:00"),
                    "EEE M/d"
                  );

                  // PTO day
                  if (row.is_time_off) {
                    const ptoLabel = row.is_paid_time_off
                      ? "PTO (paid)"
                      : "PTO (unpaid)";
                    return (
                      <tr key={row.day_date} className="border-b last:border-0">
                        <td className="p-3">{dayLabel}</td>
                        <td className="p-3 text-muted-foreground">TIME OFF</td>
                        <td className="p-3 text-muted-foreground">TIME OFF</td>
                        <td className="p-3">{formatHours(row.time_off_hours)}</td>
                        <td className="p-3 text-muted-foreground">{ptoLabel}</td>
                        <td className="p-3 text-right">
                          {formatHours(row.time_off_hours)}
                        </td>
                        <td className="p-3 text-right text-muted-foreground">
                          {row.scheduled_hours > 0
                            ? formatHours(row.scheduled_hours)
                            : "\u2014"}
                        </td>
                        <td
                          className={`p-3 text-right ${formatDifference(row.difference).className}`}
                        >
                          {formatDifference(row.difference).text}
                        </td>
                      </tr>
                    );
                  }

                  // Normal day with clock in/out
                  if (row.clock_in) {
                    const clockIn = format(new Date(row.clock_in), "h:mm a");
                    const clockOut = row.clock_out
                      ? format(new Date(row.clock_out), "h:mm a")
                      : "\u2014";
                    const details: string[] = [];
                    if (row.break_minutes > 0)
                      details.push(`${row.break_minutes}m break`);
                    if (row.position_name) details.push(row.position_name);

                    return (
                      <tr key={row.day_date} className="border-b last:border-0">
                        <td className="p-3">{dayLabel}</td>
                        <td className="p-3">{clockIn}</td>
                        <td className="p-3">{clockOut}</td>
                        <td className="p-3">
                          {formatHours(row.total_worked_hours)}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {details.length > 0 ? details.join(" \u00B7 ") : "\u2014"}
                        </td>
                        <td className="p-3 text-right">
                          {formatHours(row.total_worked_hours)}
                        </td>
                        <td className="p-3 text-right text-muted-foreground">
                          {row.scheduled_hours > 0
                            ? formatHours(row.scheduled_hours)
                            : "\u2014"}
                        </td>
                        <td
                          className={`p-3 text-right ${formatDifference(row.difference).className}`}
                        >
                          {formatDifference(row.difference).text}
                        </td>
                      </tr>
                    );
                  }

                  // Scheduled-only (no clock in but has shift)
                  if (row.shift_start) {
                    return (
                      <tr key={row.day_date} className="border-b last:border-0">
                        <td className="p-3">{dayLabel}</td>
                        <td className="p-3 text-muted-foreground">{"\u2014"}</td>
                        <td className="p-3 text-muted-foreground">{"\u2014"}</td>
                        <td className="p-3 text-muted-foreground">{"\u2014"}</td>
                        <td className="p-3 text-muted-foreground">{"\u2014"}</td>
                        <td className="p-3 text-right text-muted-foreground">
                          {"\u2014"}
                        </td>
                        <td className="p-3 text-right text-muted-foreground">
                          {formatHours(row.scheduled_hours)}
                        </td>
                        <td
                          className={`p-3 text-right ${formatDifference(row.difference).className}`}
                        >
                          {formatDifference(row.difference).text}
                        </td>
                      </tr>
                    );
                  }

                  // Empty day
                  return (
                    <tr key={row.day_date} className="border-b last:border-0">
                      <td className="p-3">{dayLabel}</td>
                      <td className="p-3 text-muted-foreground">{"\u2014"}</td>
                      <td className="p-3 text-muted-foreground">{"\u2014"}</td>
                      <td className="p-3 text-muted-foreground">{"\u2014"}</td>
                      <td className="p-3 text-muted-foreground">{"\u2014"}</td>
                      <td className="p-3 text-right text-muted-foreground">
                        {"\u2014"}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {"\u2014"}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {"\u2014"}
                      </td>
                    </tr>
                  );
                })}

                {/* Totals row */}
                <tr className="border-t-2 font-bold">
                  <td className="p-3" colSpan={5}>
                    Total
                  </td>
                  <td className="p-3 text-right">
                    {formatHours(totalWorked)}
                  </td>
                  <td className="p-3 text-right">
                    {formatHours(totalScheduled)}
                  </td>
                  <td
                    className={`p-3 text-right ${formatDifference(totalDiff).className}`}
                  >
                    {formatDifference(totalDiff).text}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Signature line */}
      <div className="text-sm">
        {signature ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>
              Signed by {signature.signature_data} on{" "}
              {format(new Date(signature.signed_at), "MMM d, yyyy")}
            </span>
          </div>
        ) : (
          <div className="text-muted-foreground">
            Signature: _______________ &nbsp; Date: _______________
          </div>
        )}
      </div>
    </div>
  );
}
