export type TimesheetDayRow = {
  day_date: string;
  clock_in: string | null;
  clock_out: string | null;
  total_worked_hours: number;
  break_minutes: number;
  shift_start: string | null;
  shift_end: string | null;
  scheduled_hours: number;
  position_name: string | null;
  is_time_off: boolean;
  time_off_hours: number;
  is_paid_time_off: boolean;
  difference: number;
};

export type TimesheetSignature = {
  id: string;
  shop_id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  signed_at: string;
  signature_data: string;
  ip_address: string | null;
  created_at: string;
};

export type TimesheetSummary = {
  regular_hours: number;
  overtime_hours: number;
  time_off_hours: number;
  paid_total_hours: number;
  scheduled_hours: number;
  worked_hours: number;
  difference: number;
};
