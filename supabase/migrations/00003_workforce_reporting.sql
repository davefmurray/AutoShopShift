-- ============================================================
-- AutoShopShift — Workforce Reporting & PTO Ledger
-- ============================================================

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_time_records_user_clock
  on public.time_records(user_id, clock_in);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Compute workforce metrics for a single user in a date range
create or replace function public.get_workforce_metrics(
  p_shop_id uuid,
  p_user_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz
)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total_shifts integer;
  v_shifts_worked integer;
  v_total_hours numeric(10,2);
  v_total_break_minutes numeric(10,2);
  v_late_arrivals integer;
  v_early_departures integer;
  v_overtime_hours numeric(10,2);
  v_hourly_rate numeric(10,2);
  v_max_hours_per_week numeric(10,2);
begin
  -- Get member config
  select coalesce(sm.hourly_rate, 0), coalesce(sm.max_hours_per_week, 40)
  into v_hourly_rate, v_max_hours_per_week
  from public.shop_members sm
  where sm.shop_id = p_shop_id
    and sm.user_id = p_user_id
    and sm.is_active = true
  limit 1;

  if v_hourly_rate is null then
    v_hourly_rate := 0;
    v_max_hours_per_week := 40;
  end if;

  -- Total published shifts for user in range
  select count(*)
  into v_total_shifts
  from public.shifts s
  where s.shop_id = p_shop_id
    and s.user_id = p_user_id
    and s.status = 'published'
    and s.start_time >= p_start_date
    and s.start_time < p_end_date;

  -- Shifts worked: published shifts that have a matching clocked_out time record
  select count(distinct s.id)
  into v_shifts_worked
  from public.shifts s
  inner join public.time_records tr
    on tr.shop_id = s.shop_id
    and tr.user_id = s.user_id
    and tr.status = 'clocked_out'
    and (
      tr.shift_id = s.id
      or (
        tr.shift_id is null
        and tr.clock_in >= s.start_time - interval '2 hours'
        and tr.clock_in <= s.start_time + interval '2 hours'
      )
    )
  where s.shop_id = p_shop_id
    and s.user_id = p_user_id
    and s.status = 'published'
    and s.start_time >= p_start_date
    and s.start_time < p_end_date;

  -- Total hours worked (from time_records, minus unpaid breaks)
  select
    coalesce(sum(
      extract(epoch from (tr.clock_out - tr.clock_in)) / 3600.0
    ), 0),
    coalesce(sum(
      (select coalesce(sum(
        extract(epoch from (coalesce(b.end_time, now()) - b.start_time)) / 60.0
      ), 0)
      from public.breaks b
      where b.time_record_id = tr.id
        and b.is_paid = false)
    ), 0)
  into v_total_hours, v_total_break_minutes
  from public.time_records tr
  where tr.shop_id = p_shop_id
    and tr.user_id = p_user_id
    and tr.status = 'clocked_out'
    and tr.clock_in >= p_start_date
    and tr.clock_in < p_end_date;

  -- Subtract unpaid break hours
  v_total_hours := v_total_hours - (v_total_break_minutes / 60.0);
  if v_total_hours < 0 then
    v_total_hours := 0;
  end if;

  -- Late arrivals: clock_in > shift.start_time + 1 min
  select count(*)
  into v_late_arrivals
  from public.shifts s
  inner join public.time_records tr
    on tr.shop_id = s.shop_id
    and tr.user_id = s.user_id
    and tr.status = 'clocked_out'
    and (
      tr.shift_id = s.id
      or (
        tr.shift_id is null
        and tr.clock_in >= s.start_time - interval '2 hours'
        and tr.clock_in <= s.start_time + interval '2 hours'
      )
    )
  where s.shop_id = p_shop_id
    and s.user_id = p_user_id
    and s.status = 'published'
    and s.start_time >= p_start_date
    and s.start_time < p_end_date
    and tr.clock_in > s.start_time + interval '1 minute';

  -- Early departures: clock_out < shift.end_time - 1 min
  select count(*)
  into v_early_departures
  from public.shifts s
  inner join public.time_records tr
    on tr.shop_id = s.shop_id
    and tr.user_id = s.user_id
    and tr.status = 'clocked_out'
    and (
      tr.shift_id = s.id
      or (
        tr.shift_id is null
        and tr.clock_in >= s.start_time - interval '2 hours'
        and tr.clock_in <= s.start_time + interval '2 hours'
      )
    )
  where s.shop_id = p_shop_id
    and s.user_id = p_user_id
    and s.status = 'published'
    and s.start_time >= p_start_date
    and s.start_time < p_end_date
    and tr.clock_out < s.end_time - interval '1 minute';

  -- Overtime: per ISO week, sum MAX(0, weekly_hours - max_hours)
  select coalesce(sum(greatest(weekly_hours - v_max_hours_per_week, 0)), 0)
  into v_overtime_hours
  from (
    select
      date_trunc('week', tr.clock_in) as iso_week,
      sum(
        extract(epoch from (tr.clock_out - tr.clock_in)) / 3600.0
        - coalesce((
          select sum(extract(epoch from (coalesce(b.end_time, now()) - b.start_time)) / 60.0) / 60.0
          from public.breaks b
          where b.time_record_id = tr.id
            and b.is_paid = false
        ), 0)
      ) as weekly_hours
    from public.time_records tr
    where tr.shop_id = p_shop_id
      and tr.user_id = p_user_id
      and tr.status = 'clocked_out'
      and tr.clock_in >= p_start_date
      and tr.clock_in < p_end_date
    group by date_trunc('week', tr.clock_in)
  ) weekly;

  return json_build_object(
    'total_shifts', v_total_shifts,
    'shifts_worked', v_shifts_worked,
    'missed_shifts', v_total_shifts - v_shifts_worked,
    'total_hours_worked', round(v_total_hours, 2),
    'total_break_minutes', round(v_total_break_minutes, 0),
    'late_arrivals', v_late_arrivals,
    'early_departures', v_early_departures,
    'overtime_hours', round(v_overtime_hours, 2),
    'labor_cost', round(v_total_hours * v_hourly_rate, 2),
    'avg_hours_per_day', case
      when v_shifts_worked > 0 then round(v_total_hours / v_shifts_worked, 2)
      else 0
    end
  );
end;
$$;

-- ============================================================
-- PTO Ledger: chronological history of all balance changes
-- ============================================================

create or replace function public.get_pto_ledger(p_shop_id uuid, p_user_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_accrual_rate numeric(6,2);
begin
  -- Get accrual rate
  select coalesce(d.pto_accrual_rate, 0)
  into v_accrual_rate
  from public.shop_members sm
  left join public.departments d on d.id = sm.department_id
  where sm.shop_id = p_shop_id
    and sm.user_id = p_user_id
    and sm.is_active = true
  limit 1;

  if v_accrual_rate is null then
    v_accrual_rate := 0;
  end if;

  return (
    select coalesce(json_agg(row_to_json(ledger)), '[]'::json)
    from (
      select
        entry_date as date,
        type,
        hours,
        description,
        sum(hours) over (order by entry_date, sort_key rows unbounded preceding) as balance_after,
        reference_id
      from (
        -- Accruals: one entry per distinct week with a clocked_out time_record
        select
          date_trunc('week', tr.clock_in)::date as entry_date,
          'accrual' as type,
          v_accrual_rate as hours,
          'Weekly PTO accrual' as description,
          null::uuid as reference_id,
          1 as sort_key
        from public.time_records tr
        where tr.shop_id = p_shop_id
          and tr.user_id = p_user_id
          and tr.status = 'clocked_out'
        group by date_trunc('week', tr.clock_in)

        union all

        -- Usage: approved + paid time_off_requests
        select
          coalesce(tor.reviewed_at::date, tor.created_at::date) as entry_date,
          'usage' as type,
          -tor.hours_requested as hours,
          'Time off: ' || tor.start_date || ' to ' || tor.end_date as description,
          tor.id as reference_id,
          2 as sort_key
        from public.time_off_requests tor
        where tor.shop_id = p_shop_id
          and tor.user_id = p_user_id
          and tor.status = 'approved'
          and tor.is_paid = true

        union all

        -- Adjustments: manual pto_balance_adjustments
        select
          pba.created_at::date as entry_date,
          'adjustment' as type,
          pba.hours as hours,
          pba.reason as description,
          pba.id as reference_id,
          3 as sort_key
        from public.pto_balance_adjustments pba
        where pba.shop_id = p_shop_id
          and pba.user_id = p_user_id

        union all

        -- Pending: pending time_off_requests
        select
          tor.created_at::date as entry_date,
          'pending' as type,
          -tor.hours_requested as hours,
          'Pending: ' || tor.start_date || ' to ' || tor.end_date as description,
          tor.id as reference_id,
          4 as sort_key
        from public.time_off_requests tor
        where tor.shop_id = p_shop_id
          and tor.user_id = p_user_id
          and tor.status = 'pending'
      ) entries
      order by entry_date, sort_key
    ) ledger
  );
end;
$$;

-- ============================================================
-- Team workforce summary: one row per active member
-- ============================================================

create or replace function public.get_team_workforce_summary(
  p_shop_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz
)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return (
    select coalesce(json_agg(row_to_json(team)), '[]'::json)
    from (
      select
        sm.user_id,
        sm.id as member_id,
        p.full_name,
        sm.role,
        d.name as department,
        -- Hours worked
        coalesce((
          select round(sum(
            extract(epoch from (tr.clock_out - tr.clock_in)) / 3600.0
            - coalesce((
              select sum(extract(epoch from (coalesce(b.end_time, now()) - b.start_time)) / 60.0) / 60.0
              from public.breaks b
              where b.time_record_id = tr.id and b.is_paid = false
            ), 0)
          ), 2)
          from public.time_records tr
          where tr.shop_id = p_shop_id
            and tr.user_id = sm.user_id
            and tr.status = 'clocked_out'
            and tr.clock_in >= p_start_date
            and tr.clock_in < p_end_date
        ), 0) as hours_worked,
        -- Overtime hours
        coalesce((
          select sum(greatest(weekly_hours - coalesce(sm.max_hours_per_week, 40), 0))
          from (
            select sum(
              extract(epoch from (tr2.clock_out - tr2.clock_in)) / 3600.0
              - coalesce((
                select sum(extract(epoch from (coalesce(b2.end_time, now()) - b2.start_time)) / 60.0) / 60.0
                from public.breaks b2
                where b2.time_record_id = tr2.id and b2.is_paid = false
              ), 0)
            ) as weekly_hours
            from public.time_records tr2
            where tr2.shop_id = p_shop_id
              and tr2.user_id = sm.user_id
              and tr2.status = 'clocked_out'
              and tr2.clock_in >= p_start_date
              and tr2.clock_in < p_end_date
            group by date_trunc('week', tr2.clock_in)
          ) w
        ), 0) as overtime_hours,
        -- Late count
        (
          select count(*)
          from public.shifts s
          inner join public.time_records tr on tr.shop_id = s.shop_id
            and tr.user_id = s.user_id
            and tr.status = 'clocked_out'
            and (tr.shift_id = s.id or (tr.shift_id is null and tr.clock_in >= s.start_time - interval '2 hours' and tr.clock_in <= s.start_time + interval '2 hours'))
          where s.shop_id = p_shop_id
            and s.user_id = sm.user_id
            and s.status = 'published'
            and s.start_time >= p_start_date
            and s.start_time < p_end_date
            and tr.clock_in > s.start_time + interval '1 minute'
        ) as late_count,
        -- Early count
        (
          select count(*)
          from public.shifts s
          inner join public.time_records tr on tr.shop_id = s.shop_id
            and tr.user_id = s.user_id
            and tr.status = 'clocked_out'
            and (tr.shift_id = s.id or (tr.shift_id is null and tr.clock_in >= s.start_time - interval '2 hours' and tr.clock_in <= s.start_time + interval '2 hours'))
          where s.shop_id = p_shop_id
            and s.user_id = sm.user_id
            and s.status = 'published'
            and s.start_time >= p_start_date
            and s.start_time < p_end_date
            and tr.clock_out < s.end_time - interval '1 minute'
        ) as early_count,
        -- Missed count
        (
          select count(*)
          from public.shifts s
          where s.shop_id = p_shop_id
            and s.user_id = sm.user_id
            and s.status = 'published'
            and s.start_time >= p_start_date
            and s.start_time < p_end_date
        ) - (
          select count(distinct s2.id)
          from public.shifts s2
          inner join public.time_records tr2 on tr2.shop_id = s2.shop_id
            and tr2.user_id = s2.user_id
            and tr2.status = 'clocked_out'
            and (tr2.shift_id = s2.id or (tr2.shift_id is null and tr2.clock_in >= s2.start_time - interval '2 hours' and tr2.clock_in <= s2.start_time + interval '2 hours'))
          where s2.shop_id = p_shop_id
            and s2.user_id = sm.user_id
            and s2.status = 'published'
            and s2.start_time >= p_start_date
            and s2.start_time < p_end_date
        ) as missed_count,
        -- Labor cost
        coalesce((
          select round(sum(
            extract(epoch from (tr.clock_out - tr.clock_in)) / 3600.0
            - coalesce((
              select sum(extract(epoch from (coalesce(b.end_time, now()) - b.start_time)) / 60.0) / 60.0
              from public.breaks b
              where b.time_record_id = tr.id and b.is_paid = false
            ), 0)
          ) * coalesce(sm.hourly_rate, 0), 2)
          from public.time_records tr
          where tr.shop_id = p_shop_id
            and tr.user_id = sm.user_id
            and tr.status = 'clocked_out'
            and tr.clock_in >= p_start_date
            and tr.clock_in < p_end_date
        ), 0) as labor_cost
      from public.shop_members sm
      inner join public.profiles p on p.id = sm.user_id
      left join public.departments d on d.id = sm.department_id
      where sm.shop_id = p_shop_id
        and sm.is_active = true
      order by p.full_name
    ) team
  );
end;
$$;
