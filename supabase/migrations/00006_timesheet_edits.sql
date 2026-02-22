-- ============================================================
-- AutoShopShift — Timesheet Edits & Activity Log
-- ============================================================

-- ============================================================
-- ENUM
-- ============================================================

CREATE TYPE public.timesheet_edit_action AS ENUM ('edit', 'create', 'delete');

-- ============================================================
-- TABLE
-- ============================================================

CREATE TABLE public.timesheet_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_record_id uuid NOT NULL,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action public.timesheet_edit_action NOT NULL,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  old_data jsonb,
  new_data jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_timesheet_activity_log_lookup
  ON public.timesheet_activity_log(shop_id, user_id, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.timesheet_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timesheet_activity_log_select" ON public.timesheet_activity_log
  FOR SELECT USING (public.is_shop_member(shop_id));

CREATE POLICY "timesheet_activity_log_insert" ON public.timesheet_activity_log
  FOR INSERT WITH CHECK (public.is_shop_admin(shop_id));

-- ============================================================
-- MODIFY get_timesheet_daily_breakdown — add time_record_id
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_timesheet_daily_breakdown(
  p_shop_id uuid,
  p_user_id uuid,
  p_start_date date,
  p_end_date date,
  p_timezone text DEFAULT 'America/New_York'
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT coalesce(json_agg(row_to_json(daily)), '[]'::json)
    FROM (
      SELECT
        gs.day_date,
        tr.id AS time_record_id,
        tr.clock_in,
        tr.clock_out,
        CASE
          WHEN tr.id IS NOT NULL THEN
            round(
              (extract(epoch FROM (tr.clock_out - tr.clock_in)) / 3600.0)
              - coalesce((
                SELECT sum(
                  extract(epoch FROM (coalesce(b.end_time, now()) - b.start_time)) / 60.0
                )
                FROM public.breaks b
                WHERE b.time_record_id = tr.id
                  AND b.is_paid = false
              ), 0) / 60.0,
              2
            )
          ELSE 0
        END AS total_worked_hours,
        coalesce((
          SELECT sum(
            extract(epoch FROM (coalesce(b.end_time, now()) - b.start_time)) / 60.0
          )
          FROM public.breaks b
          WHERE b.time_record_id = tr.id
            AND b.is_paid = false
        ), 0)::integer AS break_minutes,
        s.start_time AS shift_start,
        s.end_time AS shift_end,
        CASE
          WHEN s.id IS NOT NULL THEN
            round(
              extract(epoch FROM (s.end_time - s.start_time)) / 3600.0,
              2
            )
          ELSE 0
        END AS scheduled_hours,
        pos.name AS position_name,
        (tor.id IS NOT NULL) AS is_time_off,
        coalesce(tor.hours_requested, 0) AS time_off_hours,
        coalesce(tor.is_paid, false) AS is_paid_time_off,
        CASE
          WHEN tr.id IS NOT NULL THEN
            round(
              (extract(epoch FROM (tr.clock_out - tr.clock_in)) / 3600.0)
              - coalesce((
                SELECT sum(
                  extract(epoch FROM (coalesce(b.end_time, now()) - b.start_time)) / 60.0
                )
                FROM public.breaks b
                WHERE b.time_record_id = tr.id
                  AND b.is_paid = false
              ), 0) / 60.0
              - CASE
                  WHEN s.id IS NOT NULL THEN
                    extract(epoch FROM (s.end_time - s.start_time)) / 3600.0
                  ELSE 0
                END,
              2
            )
          ELSE
            CASE
              WHEN s.id IS NOT NULL THEN
                round(-extract(epoch FROM (s.end_time - s.start_time)) / 3600.0, 2)
              ELSE 0
            END
        END AS difference
      FROM (
        SELECT
          generate_series(p_start_date, p_end_date, '1 day'::interval)::date AS day_date
      ) gs
      LEFT JOIN LATERAL (
        SELECT
          tr_inner.id,
          min(tr_inner.clock_in) AS clock_in,
          max(tr_inner.clock_out) AS clock_out
        FROM public.time_records tr_inner
        WHERE tr_inner.shop_id = p_shop_id
          AND tr_inner.user_id = p_user_id
          AND tr_inner.status = 'clocked_out'
          AND tr_inner.clock_in >= (gs.day_date::timestamptz AT TIME ZONE p_timezone)
          AND tr_inner.clock_in < (gs.day_date::timestamptz AT TIME ZONE p_timezone + '1 day'::interval)
        GROUP BY tr_inner.id
        ORDER BY min(tr_inner.clock_in)
        LIMIT 1
      ) tr ON true
      LEFT JOIN LATERAL (
        SELECT
          s_inner.id,
          s_inner.start_time,
          s_inner.end_time,
          s_inner.position_id
        FROM public.shifts s_inner
        WHERE s_inner.shop_id = p_shop_id
          AND s_inner.user_id = p_user_id
          AND s_inner.status = 'published'
          AND s_inner.start_time >= (gs.day_date::timestamptz AT TIME ZONE p_timezone)
          AND s_inner.start_time < (gs.day_date::timestamptz AT TIME ZONE p_timezone + '1 day'::interval)
        ORDER BY s_inner.start_time
        LIMIT 1
      ) s ON true
      LEFT JOIN public.positions pos ON pos.id = s.position_id
      LEFT JOIN LATERAL (
        SELECT
          tor_inner.id,
          tor_inner.hours_requested,
          tor_inner.is_paid
        FROM public.time_off_requests tor_inner
        WHERE tor_inner.shop_id = p_shop_id
          AND tor_inner.user_id = p_user_id
          AND tor_inner.status = 'approved'
          AND gs.day_date >= tor_inner.start_date
          AND gs.day_date <= tor_inner.end_date
        LIMIT 1
      ) tor ON true
      ORDER BY gs.day_date
    ) daily
  );
END;
$$;

-- ============================================================
-- FUNCTION: get_timesheet_activity_log
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_timesheet_activity_log(
  p_shop_id uuid,
  p_user_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT coalesce(json_agg(row_to_json(entries)), '[]'::json)
    FROM (
      SELECT
        tal.id,
        tal.time_record_id,
        tal.action,
        tal.changed_by,
        tal.old_data,
        tal.new_data,
        tal.notes,
        tal.created_at,
        json_build_object('full_name', p.full_name) AS profiles
      FROM public.timesheet_activity_log tal
      LEFT JOIN public.profiles p ON p.id = tal.changed_by
      WHERE tal.shop_id = p_shop_id
        AND tal.user_id = p_user_id
        AND tal.created_at >= (p_start_date::timestamptz)
        AND tal.created_at < (p_end_date::timestamptz + '1 day'::interval)
      ORDER BY tal.created_at DESC
    ) entries
  );
END;
$$;

-- ============================================================
-- REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.timesheet_activity_log;
