"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { generateTimesheetPdf } from "@/lib/generate-timesheet-pdf";
import type { TimesheetDayRow, TimesheetSummary, TimesheetSignature } from "@/types/timesheets";
import { format } from "date-fns";

type Props = {
  shopName: string;
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  rows: TimesheetDayRow[];
  summary: TimesheetSummary;
  signature?: TimesheetSignature | null;
};

export function ExportButtons(props: Props) {
  function handleExportPdf() {
    const doc = generateTimesheetPdf({
      shopName: props.shopName,
      employeeName: props.employeeName,
      periodStart: props.periodStart,
      periodEnd: props.periodEnd,
      rows: props.rows,
      summary: props.summary,
      signature: props.signature,
    });
    const filename = `timesheet-${props.employeeName.replace(/\s+/g, "-").toLowerCase()}-${props.periodStart}.pdf`;
    doc.save(filename);
  }

  function handleExportCsv() {
    const headers = ["Date", "Day", "In", "Out", "Break Minutes", "Total Hours", "Position", "Type"];
    const csvRows = [headers.join(",")];

    props.rows.forEach(row => {
      const date = row.day_date;
      const day = format(new Date(row.day_date + "T00:00:00"), "EEEE");
      const inTime = row.is_time_off ? "TIME OFF" : (row.clock_in ? format(new Date(row.clock_in), "h:mm a") : "");
      const outTime = row.is_time_off ? "" : (row.clock_out ? format(new Date(row.clock_out), "h:mm a") : "");
      const breakMins = String(row.break_minutes);
      const totalHours = row.is_time_off ? String(row.time_off_hours) : String(row.total_worked_hours);
      const position = row.position_name ?? "";
      const type = row.is_time_off ? (row.is_paid_time_off ? "PTO (paid)" : "PTO (unpaid)") : (row.clock_in ? "Worked" : (row.scheduled_hours > 0 ? "Scheduled" : ""));

      // Escape fields that might contain commas
      const fields = [date, day, inTime, outTime, breakMins, totalHours, position, type].map(f =>
        f.includes(",") ? `"${f}"` : f
      );
      csvRows.push(fields.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheet-${props.employeeName.replace(/\s+/g, "-").toLowerCase()}-${props.periodStart}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleExportPdf}>
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportCsv}>
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
