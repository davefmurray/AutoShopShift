-- ============================================================
-- AutoShopShift — PTO System & Departments
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

create type public.time_off_request_status as enum ('pending', 'approved', 'denied', 'cancelled');

-- Extend notification_type with time-off events
alter type public.notification_type add value 'time_off_requested';
alter type public.notification_type add value 'time_off_approved';
alter type public.notification_type add value 'time_off_denied';

-- ============================================================
-- TABLES
-- ============================================================

-- Departments (broad groupings like "Front Shop", "Back Shop")
create table public.departments (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  pto_accrual_rate numeric(6,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(shop_id, name)
);

-- Add department to shop_members
alter table public.shop_members
  add column department_id uuid references public.departments(id) on delete set null;

-- Time Off Requests
create table public.time_off_requests (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  hours_requested numeric(6,2) not null,
  reason text,
  is_paid boolean,
  status public.time_off_request_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  reviewer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_off_date_check check (end_date >= start_date),
  constraint time_off_hours_check check (hours_requested > 0)
);

-- PTO Balance Adjustments (starting balances, manual corrections, carryover)
create table public.pto_balance_adjustments (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  hours numeric(6,2) not null,
  reason text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_departments_shop on public.departments(shop_id);
create index idx_shop_members_department on public.shop_members(department_id);
create index idx_time_off_requests_shop on public.time_off_requests(shop_id);
create index idx_time_off_requests_user on public.time_off_requests(user_id);
create index idx_time_off_requests_status on public.time_off_requests(status);
create index idx_pto_balance_adjustments_shop_user on public.pto_balance_adjustments(shop_id, user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.departments enable row level security;
alter table public.time_off_requests enable row level security;
alter table public.pto_balance_adjustments enable row level security;

-- Departments: members read, admins manage (same as positions)
create policy "departments_select" on public.departments for select using (public.is_shop_member(shop_id));
create policy "departments_insert" on public.departments for insert with check (public.is_shop_admin(shop_id));
create policy "departments_update" on public.departments for update using (public.is_shop_admin(shop_id));
create policy "departments_delete" on public.departments for delete using (public.is_shop_admin(shop_id));

-- Time Off Requests: members read shop, self insert, admins or self update
create policy "time_off_requests_select" on public.time_off_requests for select using (public.is_shop_member(shop_id));
create policy "time_off_requests_insert" on public.time_off_requests for insert with check (
  public.is_shop_member(shop_id) and user_id = auth.uid()
);
create policy "time_off_requests_update" on public.time_off_requests for update using (
  public.is_shop_admin(shop_id) or user_id = auth.uid()
);

-- PTO Balance Adjustments: members read, admins insert
create policy "pto_balance_adjustments_select" on public.pto_balance_adjustments for select using (public.is_shop_member(shop_id));
create policy "pto_balance_adjustments_insert" on public.pto_balance_adjustments for insert with check (public.is_shop_admin(shop_id));

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Compute PTO balance for a user in a shop
create or replace function public.get_pto_balance(p_shop_id uuid, p_user_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_accrual_rate numeric(6,2);
  v_weeks_worked integer;
  v_manual_adjustments numeric(6,2);
  v_hours_accrued numeric(6,2);
  v_hours_used numeric(6,2);
  v_hours_pending numeric(6,2);
  v_hours_available numeric(6,2);
begin
  -- Get the department accrual rate for this member
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

  -- Count distinct weeks with completed time records
  select count(distinct date_trunc('week', clock_in))
  into v_weeks_worked
  from public.time_records
  where shop_id = p_shop_id
    and user_id = p_user_id
    and status = 'clocked_out';

  -- Sum manual adjustments
  select coalesce(sum(hours), 0)
  into v_manual_adjustments
  from public.pto_balance_adjustments
  where shop_id = p_shop_id
    and user_id = p_user_id;

  -- Accrued = weeks worked * rate + manual adjustments
  v_hours_accrued := (v_weeks_worked * v_accrual_rate) + v_manual_adjustments;

  -- Used = sum of approved + paid requests
  select coalesce(sum(hours_requested), 0)
  into v_hours_used
  from public.time_off_requests
  where shop_id = p_shop_id
    and user_id = p_user_id
    and status = 'approved'
    and is_paid = true;

  -- Pending = sum of pending requests
  select coalesce(sum(hours_requested), 0)
  into v_hours_pending
  from public.time_off_requests
  where shop_id = p_shop_id
    and user_id = p_user_id
    and status = 'pending';

  -- Available = accrued - used - pending
  v_hours_available := v_hours_accrued - v_hours_used - v_hours_pending;

  return json_build_object(
    'hours_accrued', v_hours_accrued,
    'hours_used', v_hours_used,
    'hours_pending', v_hours_pending,
    'hours_available', v_hours_available
  );
end;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

create trigger set_updated_at before update on public.departments for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.time_off_requests for each row execute function public.handle_updated_at();

-- ============================================================
-- REALTIME
-- ============================================================

alter publication supabase_realtime add table public.time_off_requests;
