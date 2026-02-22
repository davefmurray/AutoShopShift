-- ============================================================
-- AutoShopShift — Timesheet Signatures & Daily Breakdown
-- ============================================================

-- ============================================================
-- TABLE
-- ============================================================

CREATE TABLE public.timesheet_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  signature_data text NOT NULL,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id, user_id, period_start, period_end)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_timesheet_signatures_shop_user ON public.timesheet_signatures(shop_id, user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.timesheet_signatures ENABLE ROW LEVEL SECURITY;

-- All shop members can view signatures in their shop
CREATE POLICY "timesheet_signatures_select" ON public.timesheet_signatures
  FOR SELECT USING (public.is_shop_member(shop_id));

-- Users can only insert their own signatures
CREATE POLICY "timesheet_signatures_insert" ON public.timesheet_signatures
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can delete signatures
CREATE POLICY "timesheet_signatures_delete" ON public.timesheet_signatures
  FOR DELETE USING (public.is_shop_admin(shop_id));

-- ============================================================
-- FUNCTIONS
-- ============================================================

create or replace function public.get_timesheet_daily_breakdown(
  p_shop_id uuid,
  p_user_id uuid,
  p_start_date date,
  p_end_date date,
  p_timezone text default 'America/New_York'
)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return (
    select coalesce(json_agg(row_to_json(daily)), '[]'::json)
    from (
      select
        gs.day_date,
        tr.clock_in,
        tr.clock_out,
        case
          when tr.id is not null then
            round(
              (extract(epoch from (tr.clock_out - tr.clock_in)) / 3600.0)
              - coalesce((
                select sum(
                  extract(epoch from (coalesce(b.end_time, now()) - b.start_time)) / 60.0
                )
                from public.breaks b
                where b.time_record_id = tr.id
                  and b.is_paid = false
              ), 0) / 60.0,
              2
            )
          else 0
        end as total_worked_hours,
        coalesce((
          select sum(
            extract(epoch from (coalesce(b.end_time, now()) - b.start_time)) / 60.0
          )
          from public.breaks b
          where b.time_record_id = tr.id
            and b.is_paid = false
        ), 0)::integer as break_minutes,
        s.start_time as shift_start,
        s.end_time as shift_end,
        case
          when s.id is not null then
            round(
              extract(epoch from (s.end_time - s.start_time)) / 3600.0,
              2
            )
          else 0
        end as scheduled_hours,
        pos.name as position_name,
        (tor.id is not null) as is_time_off,
        coalesce(tor.hours_requested, 0) as time_off_hours,
        coalesce(tor.is_paid, false) as is_paid_time_off,
        case
          when tr.id is not null then
            round(
              (extract(epoch from (tr.clock_out - tr.clock_in)) / 3600.0)
              - coalesce((
                select sum(
                  extract(epoch from (coalesce(b.end_time, now()) - b.start_time)) / 60.0
                )
                from public.breaks b
                where b.time_record_id = tr.id
                  and b.is_paid = false
              ), 0) / 60.0
              - case
                  when s.id is not null then
                    extract(epoch from (s.end_time - s.start_time)) / 3600.0
                  else 0
                end,
              2
            )
          else
            case
              when s.id is not null then
                round(-extract(epoch from (s.end_time - s.start_time)) / 3600.0, 2)
              else 0
            end
        end as difference
      from (
        select
          generate_series(p_start_date, p_end_date, '1 day'::interval)::date as day_date
      ) gs
      left join lateral (
        select
          tr_inner.id,
          min(tr_inner.clock_in) as clock_in,
          max(tr_inner.clock_out) as clock_out
        from public.time_records tr_inner
        where tr_inner.shop_id = p_shop_id
          and tr_inner.user_id = p_user_id
          and tr_inner.status = 'clocked_out'
          and tr_inner.clock_in >= (gs.day_date::timestamptz AT TIME ZONE p_timezone)
          and tr_inner.clock_in < (gs.day_date::timestamptz AT TIME ZONE p_timezone + '1 day'::interval)
        group by tr_inner.id
        order by min(tr_inner.clock_in)
        limit 1
      ) tr on true
      left join lateral (
        select
          s_inner.id,
          s_inner.start_time,
          s_inner.end_time,
          s_inner.position_id
        from public.shifts s_inner
        where s_inner.shop_id = p_shop_id
          and s_inner.user_id = p_user_id
          and s_inner.status = 'published'
          and s_inner.start_time >= (gs.day_date::timestamptz AT TIME ZONE p_timezone)
          and s_inner.start_time < (gs.day_date::timestamptz AT TIME ZONE p_timezone + '1 day'::interval)
        order by s_inner.start_time
        limit 1
      ) s on true
      left join public.positions pos on pos.id = s.position_id
      left join lateral (
        select
          tor_inner.id,
          tor_inner.hours_requested,
          tor_inner.is_paid
        from public.time_off_requests tor_inner
        where tor_inner.shop_id = p_shop_id
          and tor_inner.user_id = p_user_id
          and tor_inner.status = 'approved'
          and gs.day_date >= tor_inner.start_date
          and gs.day_date <= tor_inner.end_date
        limit 1
      ) tor on true
      order by gs.day_date
    ) daily
  );
end;
$$;

-- ============================================================
-- REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.timesheet_signatures;
