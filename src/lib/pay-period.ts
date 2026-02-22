import { startOfWeek, endOfWeek, addWeeks, subWeeks, format } from "date-fns";

export type PayPeriodSettings = {
  pay_period_type: "weekly";
  week_start_day: number; // 0=Sun, 1=Mon, ..., 6=Sat
};

export function getPayPeriodSettings(shopSettings: Record<string, unknown> | null): PayPeriodSettings {
  // Parse from shops.settings JSONB, default to weekly/Monday
  return {
    pay_period_type: "weekly",
    week_start_day: typeof shopSettings?.week_start_day === "number"
      ? shopSettings.week_start_day
      : 1,
  };
}

export function getCurrentPayPeriod(weekStartDay: number): { start: Date; end: Date } {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: weekStartDay as 0|1|2|3|4|5|6 });
  const end = endOfWeek(now, { weekStartsOn: weekStartDay as 0|1|2|3|4|5|6 });
  return { start, end };
}

export function navigatePayPeriod(
  current: { start: Date; end: Date },
  direction: "prev" | "next",
  weekStartDay: number
): { start: Date; end: Date } {
  const fn = direction === "next" ? addWeeks : subWeeks;
  const newStart = fn(current.start, 1);
  const newEnd = endOfWeek(newStart, { weekStartsOn: weekStartDay as 0|1|2|3|4|5|6 });
  return { start: newStart, end: newEnd };
}

export function formatPayPeriod(start: Date, end: Date): string {
  return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
}
