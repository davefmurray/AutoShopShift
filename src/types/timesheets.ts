export type TimesheetDayRow = {
  day_date: string;
  time_record_id: string | null;
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

export type TimesheetActivityEntry = {
  id: string;
  time_record_id: string;
  action: "edit" | "create" | "delete";
  changed_by: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
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
