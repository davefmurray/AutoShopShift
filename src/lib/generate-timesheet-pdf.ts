import { jsPDF } from "jspdf";
import { format } from "date-fns";
import type { TimesheetDayRow, TimesheetSummary, TimesheetSignature } from "@/types/timesheets";

type TimesheetPdfData = {
  shopName: string;
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  rows: TimesheetDayRow[];
  summary: TimesheetSummary;
  signature?: TimesheetSignature | null;
};

export function generateTimesheetPdf(data: TimesheetPdfData): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header
  doc.setFontSize(16);
  doc.text(data.shopName, 14, y);
  y += 8;

  doc.setFontSize(12);
  doc.text(`Employee: ${data.employeeName}`, 14, y);
  y += 6;
  doc.text(`Period: ${data.periodStart} to ${data.periodEnd}`, 14, y);
  y += 10;

  // Summary stats
  doc.setFontSize(10);
  const summaryItems = [
    `Regular: ${data.summary.regular_hours}h`,
    `Overtime: ${data.summary.overtime_hours}h`,
    `Time Off: ${data.summary.time_off_hours}h`,
    `Paid Total: ${data.summary.paid_total_hours}h`,
    `Scheduled: ${data.summary.scheduled_hours}h`,
    `Worked: ${data.summary.worked_hours}h`,
  ];
  doc.text(summaryItems.join("   |   "), 14, y);
  y += 10;

  // Table headers
  const cols = [
    { label: "Day", x: 14, w: 30 },
    { label: "In", x: 44, w: 25 },
    { label: "Out", x: 69, w: 25 },
    { label: "Total", x: 94, w: 20 },
    { label: "Details", x: 114, w: 55 },
    { label: "Worked", x: 169, w: 25 },
    { label: "Scheduled", x: 194, w: 25 },
    { label: "Difference", x: 219, w: 25 },
  ];

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  // Draw header row background
  doc.setFillColor(240, 240, 240);
  doc.rect(14, y - 4, pageWidth - 28, 6, "F");
  cols.forEach(col => {
    doc.text(col.label, col.x, y);
  });
  y += 7;

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  data.rows.forEach(row => {
    if (y > 190) {
      doc.addPage();
      y = 15;
    }

    const dayStr = formatDayForPdf(row.day_date);
    const inStr = row.is_time_off ? "TIME OFF" : (row.clock_in ? formatTimeForPdf(row.clock_in) : "\u2014");
    const outStr = row.is_time_off ? "" : (row.clock_out ? formatTimeForPdf(row.clock_out) : "\u2014");
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
    cols.forEach((col, i) => {
      doc.text(String(values[i]), col.x, y);
    });
    y += 5;
  });

  // Totals row
  y += 2;
  doc.setFont("helvetica", "bold");
  doc.text("Totals", 14, y);
  doc.text(data.summary.worked_hours.toFixed(2), 169, y);
  doc.text(data.summary.scheduled_hours.toFixed(2), 194, y);
  const totalDiff = data.summary.difference;
  doc.text(totalDiff !== 0 ? (totalDiff > 0 ? `+${totalDiff.toFixed(2)}` : totalDiff.toFixed(2)) : "0.00", 219, y);
  y += 12;

  // Signature section
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (data.signature) {
    doc.text(`Signed by: ${data.signature.signature_data}`, 14, y);
    doc.text(`Date: ${format(new Date(data.signature.signed_at), "MMM d, yyyy 'at' h:mm a")}`, 14, y + 6);
  } else {
    doc.text("Signature: _________________________________", 14, y);
    doc.text("Date: _________________________________", 14, y + 6);
  }

  return doc;
}

function formatDayForPdf(dateStr: string): string {
  return format(new Date(dateStr + "T00:00:00"), "EEE M/d");
}

function formatTimeForPdf(isoStr: string): string {
  return format(new Date(isoStr), "h:mm a");
}
