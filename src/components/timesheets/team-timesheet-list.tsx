"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Download, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useShopStore } from "@/stores/shop-store";
import { useShopTimezone } from "@/hooks/use-shop-timezone";
import { generateTimesheetPdf } from "@/lib/generate-timesheet-pdf";
import { computeTimesheetSummary } from "@/hooks/use-timesheets";
import type { TimesheetDayRow, TimesheetSignature } from "@/types/timesheets";

export type TeamTimesheetMember = {
  member_id: string;
  user_id: string;
  full_name: string | null;
  hours_worked: number;
  overtime_hours: number;
  time_off_hours: number;
};

type TeamTimesheetListProps = {
  members: TeamTimesheetMember[];
  periodStart: string;
  periodEnd: string;
  signatures: TimesheetSignature[];
  shopName?: string;
};

export function TeamTimesheetList({
  members,
  periodStart,
  periodEnd,
  signatures,
  shopName,
}: TeamTimesheetListProps) {
  const [exporting, setExporting] = useState(false);
  const shopId = useShopStore((s) => s.activeShopId);
  const timezone = useShopTimezone();

  const signatureByUserId = new Map(
    signatures.map((s) => [s.user_id, s])
  );

  async function handleExportAll() {
    if (!shopId || members.length === 0) return;
    setExporting(true);

    try {
      const supabase = createClient();

      // Fetch breakdown for all members in parallel
      const breakdownPromises = members.map(async (m) => {
        const { data } = await supabase.rpc("get_timesheet_daily_breakdown", {
          p_shop_id: shopId,
          p_user_id: m.user_id,
          p_start_date: periodStart,
          p_end_date: periodEnd,
          p_timezone: timezone ?? "America/New_York",
        });
        return {
          member: m,
          rows: (data as unknown as TimesheetDayRow[]) ?? [],
          signature: signatureByUserId.get(m.user_id) ?? null,
        };
      });

      const results = await Promise.all(breakdownPromises);

      // Generate a single merged PDF with each employee on a new page
      const firstResult = results[0];
      if (!firstResult) return;

      const firstSummary = computeTimesheetSummary(firstResult.rows);
      const doc = generateTimesheetPdf({
        shopName: shopName ?? "Shop",
        employeeName: firstResult.member.full_name ?? "Unknown",
        periodStart,
        periodEnd,
        rows: firstResult.rows,
        summary: firstSummary,
        signature: firstResult.signature,
      });

      // Add subsequent employees each on a new page
      for (let i = 1; i < results.length; i++) {
        const result = results[i];
        const summary = computeTimesheetSummary(result.rows);

        doc.addPage("a4", "landscape");
        let y = 15;

        // Header
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(shopName ?? "Shop", 14, y);
        y += 8;

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Employee: ${result.member.full_name ?? "Unknown"}`, 14, y);
        y += 6;
        doc.text(`Period: ${periodStart} to ${periodEnd}`, 14, y);
        y += 10;

        // Summary stats
        doc.setFontSize(10);
        const summaryItems = [
          `Regular: ${summary.regular_hours}h`,
          `Overtime: ${summary.overtime_hours}h`,
          `Time Off: ${summary.time_off_hours}h`,
          `Paid Total: ${summary.paid_total_hours}h`,
          `Scheduled: ${summary.scheduled_hours}h`,
          `Worked: ${summary.worked_hours}h`,
        ];
        doc.text(summaryItems.join("   |   "), 14, y);
        y += 10;

        // Table headers
        const pageWidth = doc.internal.pageSize.getWidth();
        const cols = [
          { label: "Day", x: 14 },
          { label: "In", x: 44 },
          { label: "Out", x: 69 },
          { label: "Total", x: 94 },
          { label: "Details", x: 114 },
          { label: "Worked", x: 169 },
          { label: "Scheduled", x: 194 },
          { label: "Difference", x: 219 },
        ];

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setFillColor(240, 240, 240);
        doc.rect(14, y - 4, pageWidth - 28, 6, "F");
        cols.forEach(col => {
          doc.text(col.label, col.x, y);
        });
        y += 7;

        // Table rows
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);

        result.rows.forEach(row => {
          if (y > 190) {
            doc.addPage();
            y = 15;
          }

          const dayStr = format(new Date(row.day_date + "T00:00:00"), "EEE M/d");
          const inStr = row.is_time_off ? "TIME OFF" : (row.clock_in ? format(new Date(row.clock_in), "h:mm a") : "\u2014");
          const outStr = row.is_time_off ? "" : (row.clock_out ? format(new Date(row.clock_out), "h:mm a") : "\u2014");
          const totalStr = row.total_worked_hours > 0 ? `${row.total_worked_hours.toFixed(2)}h` : (row.is_time_off ? `${row.time_off_hours.toFixed(2)}h` : "\u2014");

          let details = "";
          if (row.is_time_off) {
            details = row.is_paid_time_off ? "PTO (paid)" : "PTO (unpaid)";
          } else if (row.clock_in) {
            const parts: string[] = [];
            if (row.break_minutes > 0) parts.push(`${row.break_minutes}min break`);
            if (row.position_name) parts.push(row.position_name);
            details = parts.join(", ");
          }

          const workedStr = row.total_worked_hours > 0 ? row.total_worked_hours.toFixed(2) : (row.is_time_off && row.is_paid_time_off ? row.time_off_hours.toFixed(2) : "\u2014");
          const schedStr = row.scheduled_hours > 0 ? row.scheduled_hours.toFixed(2) : "\u2014";
          const diffVal = row.difference;
          const diffStr = diffVal !== 0 ? (diffVal > 0 ? `+${diffVal.toFixed(2)}` : diffVal.toFixed(2)) : "\u2014";

          const values = [dayStr, inStr, outStr, totalStr, details, workedStr, schedStr, diffStr];
          cols.forEach((col, idx) => {
            doc.text(String(values[idx]), col.x, y);
          });
          y += 5;
        });

        // Totals row
        y += 2;
        doc.setFont("helvetica", "bold");
        doc.text("Totals", 14, y);
        doc.text(summary.worked_hours.toFixed(2), 169, y);
        doc.text(summary.scheduled_hours.toFixed(2), 194, y);
        const totalDiff = summary.difference;
        doc.text(totalDiff !== 0 ? (totalDiff > 0 ? `+${totalDiff.toFixed(2)}` : totalDiff.toFixed(2)) : "0.00", 219, y);
        y += 12;

        // Signature section
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        if (result.signature) {
          doc.text(`Signed by: ${result.signature.signature_data}`, 14, y);
          doc.text(`Date: ${format(new Date(result.signature.signed_at), "MMM d, yyyy 'at' h:mm a")}`, 14, y + 6);
        } else {
          doc.text("Signature: _________________________________", 14, y);
          doc.text("Date: _________________________________", 14, y + 6);
        }
      }

      doc.save(`timesheets-all-${periodStart}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      {members.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAll}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {exporting ? "Exporting..." : "Export All"}
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium text-right">Hours</th>
                <th className="p-3 font-medium text-right">OT</th>
                <th className="p-3 font-medium text-right">Time Off</th>
                <th className="p-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.member_id} className="border-b last:border-0">
                  <td className="p-3 font-medium">
                    <Link
                      href={`/timesheets/${m.member_id}`}
                      className="hover:underline"
                    >
                      {m.full_name ?? "Unknown"}
                    </Link>
                  </td>
                  <td className="p-3 text-right">
                    {(m.hours_worked ?? 0).toFixed(1)}
                  </td>
                  <td className="p-3 text-right">
                    {(m.overtime_hours ?? 0).toFixed(1)}
                  </td>
                  <td className="p-3 text-right">
                    {(m.time_off_hours ?? 0).toFixed(1)}
                  </td>
                  <td className="p-3 text-right">
                    {signatureByUserId.has(m.user_id) ? (
                      <Badge variant="default" title={
                        `Signed ${format(
                          new Date(signatureByUserId.get(m.user_id)!.signed_at),
                          "MMM d, yyyy"
                        )}`
                      }>
                        Signed{" "}
                        <span className="ml-1 text-xs opacity-80">
                          {format(
                            new Date(signatureByUserId.get(m.user_id)!.signed_at),
                            "M/d"
                          )}
                        </span>
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Unsigned</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-muted-foreground"
                  >
                    No team members for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
