-- ============================================================
-- AutoShopShift — Initial Schema (Phase 1: MVP)
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

create type public.shop_role as enum ('owner', 'manager', 'technician');
create type public.shift_status as enum ('draft', 'published');
create type public.swap_status as enum ('pending', 'approved', 'denied', 'cancelled');
create type public.claim_status as enum ('pending', 'approved', 'denied');
create type public.time_record_status as enum ('clocked_in', 'on_break', 'clocked_out');
create type public.shift_action as enum ('create', 'update', 'delete', 'publish', 'unpublish', 'assign', 'unassign');
create type public.notification_type as enum (
  'shift_published',
  'shift_assigned',
  'shift_updated',
  'shift_deleted',
  'swap_requested',
  'swap_approved',
  'swap_denied',
  'open_shift_available',
  'open_shift_claimed',
  'open_shift_approved',
  'open_shift_denied',
  'clock_reminder',
  'schedule_updated',
  'team_invite'
);

-- ============================================================
-- TABLES
-- ============================================================

-- Shops
create table public.shops (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text,
  city text,
  state text,
  zip text,
  phone text,
  timezone text not null default 'America/New_York',
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Shop Members (join table: user ↔ shop)
create table public.shop_members (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.shop_role not null default 'technician',
  hourly_rate numeric(10,2),
  max_hours_per_week integer default 40,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(shop_id, user_id)
);

-- Positions (job roles with colors)
create table public.positions (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  color text not null default '#3B82F6',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Member Positions (M:N)
create table public.member_positions (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references public.shop_members(id) on delete cascade,
  position_id uuid not null references public.positions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(member_id, position_id)
);

-- Schedules (logical groupings)
create table public.schedules (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  color text not null default '#6366F1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Shifts (core entity)
create table public.shifts (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  schedule_id uuid references public.schedules(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  position_id uuid references public.positions(id) on delete set null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  break_minutes integer not null default 0,
  status public.shift_status not null default 'draft',
  is_open boolean not null default false,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shifts_time_check check (end_time > start_time)
);

-- Shift History (audit log)
create table public.shift_history (
  id uuid primary key default uuid_generate_v4(),
  shift_id uuid not null,
  shop_id uuid not null references public.shops(id) on delete cascade,
  action public.shift_action not null,
  changed_by uuid references public.profiles(id) on delete set null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

-- Swap Requests
create table public.swap_requests (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  requester_shift_id uuid not null references public.shifts(id) on delete cascade,
  target_shift_id uuid references public.shifts(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid references public.profiles(id) on delete set null,
  status public.swap_status not null default 'pending',
  reason text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Open Shift Claims
create table public.open_shift_claims (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.claim_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Time Records
create table public.time_records (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  shift_id uuid references public.shifts(id) on delete set null,
  clock_in timestamptz not null,
  clock_out timestamptz,
  status public.time_record_status not null default 'clocked_in',
  notes text,
  is_manual boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Breaks
create table public.breaks (
  id uuid primary key default uuid_generate_v4(),
  time_record_id uuid not null references public.time_records(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz,
  is_paid boolean not null default false,
  created_at timestamptz not null default now()
);

-- Shift Templates
create table public.shift_templates (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  position_id uuid references public.positions(id) on delete set null,
  start_time time not null,
  end_time time not null,
  break_minutes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Schedule Templates
create table public.schedule_templates (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Schedule Template Entries
create table public.schedule_template_entries (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid not null references public.schedule_templates(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  position_id uuid references public.positions(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  start_time time not null,
  end_time time not null,
  break_minutes integer not null default 0,
  created_at timestamptz not null default now()
);

-- Notifications
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text,
  data jsonb default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_shop_members_shop on public.shop_members(shop_id);
create index idx_shop_members_user on public.shop_members(user_id);
create index idx_shifts_shop on public.shifts(shop_id);
create index idx_shifts_user on public.shifts(user_id);
create index idx_shifts_schedule on public.shifts(schedule_id);
create index idx_shifts_time on public.shifts(start_time, end_time);
create index idx_shifts_status on public.shifts(status);
create index idx_shift_history_shift on public.shift_history(shift_id);
create index idx_swap_requests_shop on public.swap_requests(shop_id);
create index idx_open_shift_claims_shift on public.open_shift_claims(shift_id);
create index idx_time_records_shop_user on public.time_records(shop_id, user_id);
create index idx_time_records_clock on public.time_records(clock_in, clock_out);
create index idx_notifications_user on public.notifications(user_id, is_read);
create index idx_notifications_shop on public.notifications(shop_id);

-- ============================================================
-- HELPER FUNCTIONS (used by RLS policies)
-- ============================================================

create or replace function public.get_user_shop_role(p_shop_id uuid)
returns public.shop_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.shop_members
  where shop_id = p_shop_id
    and user_id = auth.uid()
    and is_active = true
  limit 1;
$$;

create or replace function public.is_shop_member(p_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.shop_members
    where shop_id = p_shop_id
      and user_id = auth.uid()
      and is_active = true
  );
$$;

create or replace function public.is_shop_admin(p_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.shop_members
    where shop_id = p_shop_id
      and user_id = auth.uid()
      and is_active = true
      and role in ('owner', 'manager')
  );
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.shops enable row level security;
alter table public.profiles enable row level security;
alter table public.shop_members enable row level security;
alter table public.positions enable row level security;
alter table public.member_positions enable row level security;
alter table public.schedules enable row level security;
alter table public.shifts enable row level security;
alter table public.shift_history enable row level security;
alter table public.swap_requests enable row level security;
alter table public.open_shift_claims enable row level security;
alter table public.time_records enable row level security;
alter table public.breaks enable row level security;
alter table public.shift_templates enable row level security;
alter table public.schedule_templates enable row level security;
alter table public.schedule_template_entries enable row level security;
alter table public.notifications enable row level security;

-- Profiles: users can read all profiles (for team display), update own
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update using (id = auth.uid());
create policy "profiles_insert" on public.profiles for insert with check (id = auth.uid());

-- Shops: members can read, admins can update
create policy "shops_select" on public.shops for select using (public.is_shop_member(id));
create policy "shops_update" on public.shops for update using (public.is_shop_admin(id));
create policy "shops_insert" on public.shops for insert with check (true);

-- Shop Members: members can read, admins can insert/update/delete
create policy "shop_members_select" on public.shop_members for select using (public.is_shop_member(shop_id));
create policy "shop_members_insert" on public.shop_members for insert with check (
  public.is_shop_admin(shop_id) or
  -- Allow the first member (owner) to insert themselves
  not exists(select 1 from public.shop_members where shop_id = shop_members.shop_id)
);
create policy "shop_members_update" on public.shop_members for update using (public.is_shop_admin(shop_id));
create policy "shop_members_delete" on public.shop_members for delete using (public.is_shop_admin(shop_id));

-- Positions: members read, admins manage
create policy "positions_select" on public.positions for select using (public.is_shop_member(shop_id));
create policy "positions_insert" on public.positions for insert with check (public.is_shop_admin(shop_id));
create policy "positions_update" on public.positions for update using (public.is_shop_admin(shop_id));
create policy "positions_delete" on public.positions for delete using (public.is_shop_admin(shop_id));

-- Member Positions: members read, admins manage
create policy "member_positions_select" on public.member_positions for select using (
  exists(select 1 from public.shop_members sm where sm.id = member_positions.member_id and public.is_shop_member(sm.shop_id))
);
create policy "member_positions_insert" on public.member_positions for insert with check (
  exists(select 1 from public.shop_members sm where sm.id = member_positions.member_id and public.is_shop_admin(sm.shop_id))
);
create policy "member_positions_delete" on public.member_positions for delete using (
  exists(select 1 from public.shop_members sm where sm.id = member_positions.member_id and public.is_shop_admin(sm.shop_id))
);

-- Schedules: members read, admins manage
create policy "schedules_select" on public.schedules for select using (public.is_shop_member(shop_id));
create policy "schedules_insert" on public.schedules for insert with check (public.is_shop_admin(shop_id));
create policy "schedules_update" on public.schedules for update using (public.is_shop_admin(shop_id));
create policy "schedules_delete" on public.schedules for delete using (public.is_shop_admin(shop_id));

-- Shifts: members read, admins manage
create policy "shifts_select" on public.shifts for select using (public.is_shop_member(shop_id));
create policy "shifts_insert" on public.shifts for insert with check (public.is_shop_admin(shop_id));
create policy "shifts_update" on public.shifts for update using (public.is_shop_admin(shop_id));
create policy "shifts_delete" on public.shifts for delete using (public.is_shop_admin(shop_id));

-- Shift History: members read, system writes (via trigger)
create policy "shift_history_select" on public.shift_history for select using (public.is_shop_member(shop_id));

-- Swap Requests: members read own shop, participants manage
create policy "swap_requests_select" on public.swap_requests for select using (public.is_shop_member(shop_id));
create policy "swap_requests_insert" on public.swap_requests for insert with check (
  public.is_shop_member(shop_id) and requester_id = auth.uid()
);
create policy "swap_requests_update" on public.swap_requests for update using (
  public.is_shop_admin(shop_id) or requester_id = auth.uid() or target_id = auth.uid()
);

-- Open Shift Claims: members read, members can claim, admins approve
create policy "open_shift_claims_select" on public.open_shift_claims for select using (public.is_shop_member(shop_id));
create policy "open_shift_claims_insert" on public.open_shift_claims for insert with check (
  public.is_shop_member(shop_id) and user_id = auth.uid()
);
create policy "open_shift_claims_update" on public.open_shift_claims for update using (public.is_shop_admin(shop_id));

-- Time Records: members read own shop, own records + admins manage
create policy "time_records_select" on public.time_records for select using (public.is_shop_member(shop_id));
create policy "time_records_insert" on public.time_records for insert with check (
  public.is_shop_member(shop_id) and (user_id = auth.uid() or public.is_shop_admin(shop_id))
);
create policy "time_records_update" on public.time_records for update using (
  user_id = auth.uid() or public.is_shop_admin(shop_id)
);

-- Breaks: follow time_records access
create policy "breaks_select" on public.breaks for select using (
  exists(select 1 from public.time_records tr where tr.id = breaks.time_record_id and public.is_shop_member(tr.shop_id))
);
create policy "breaks_insert" on public.breaks for insert with check (
  exists(select 1 from public.time_records tr where tr.id = breaks.time_record_id and (tr.user_id = auth.uid() or public.is_shop_admin(tr.shop_id)))
);
create policy "breaks_update" on public.breaks for update using (
  exists(select 1 from public.time_records tr where tr.id = breaks.time_record_id and (tr.user_id = auth.uid() or public.is_shop_admin(tr.shop_id)))
);

-- Templates: members read, admins manage
create policy "shift_templates_select" on public.shift_templates for select using (public.is_shop_member(shop_id));
create policy "shift_templates_insert" on public.shift_templates for insert with check (public.is_shop_admin(shop_id));
create policy "shift_templates_update" on public.shift_templates for update using (public.is_shop_admin(shop_id));
create policy "shift_templates_delete" on public.shift_templates for delete using (public.is_shop_admin(shop_id));

create policy "schedule_templates_select" on public.schedule_templates for select using (public.is_shop_member(shop_id));
create policy "schedule_templates_insert" on public.schedule_templates for insert with check (public.is_shop_admin(shop_id));
create policy "schedule_templates_update" on public.schedule_templates for update using (public.is_shop_admin(shop_id));
create policy "schedule_templates_delete" on public.schedule_templates for delete using (public.is_shop_admin(shop_id));

create policy "schedule_template_entries_select" on public.schedule_template_entries for select using (
  exists(select 1 from public.schedule_templates st where st.id = schedule_template_entries.template_id and public.is_shop_member(st.shop_id))
);
create policy "schedule_template_entries_insert" on public.schedule_template_entries for insert with check (
  exists(select 1 from public.schedule_templates st where st.id = schedule_template_entries.template_id and public.is_shop_admin(st.shop_id))
);
create policy "schedule_template_entries_update" on public.schedule_template_entries for update using (
  exists(select 1 from public.schedule_templates st where st.id = schedule_template_entries.template_id and public.is_shop_admin(st.shop_id))
);
create policy "schedule_template_entries_delete" on public.schedule_template_entries for delete using (
  exists(select 1 from public.schedule_templates st where st.id = schedule_template_entries.template_id and public.is_shop_admin(st.shop_id))
);

-- Notifications: users read own, system writes
create policy "notifications_select" on public.notifications for select using (user_id = auth.uid());
create policy "notifications_update" on public.notifications for update using (user_id = auth.uid());
create policy "notifications_insert" on public.notifications for insert with check (true);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.shops for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.profiles for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.shop_members for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.positions for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.schedules for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.shifts for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.swap_requests for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.open_shift_claims for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.time_records for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.shift_templates for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.schedule_templates for each row execute function public.handle_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Shift audit trail
create or replace function public.handle_shift_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (TG_OP = 'INSERT') then
    insert into public.shift_history (shift_id, shop_id, action, changed_by, new_data)
    values (new.id, new.shop_id, 'create', auth.uid(), to_jsonb(new));
    return new;
  elsif (TG_OP = 'UPDATE') then
    -- Detect specific action types
    if (old.status = 'draft' and new.status = 'published') then
      insert into public.shift_history (shift_id, shop_id, action, changed_by, old_data, new_data)
      values (new.id, new.shop_id, 'publish', auth.uid(), to_jsonb(old), to_jsonb(new));
    elsif (old.status = 'published' and new.status = 'draft') then
      insert into public.shift_history (shift_id, shop_id, action, changed_by, old_data, new_data)
      values (new.id, new.shop_id, 'unpublish', auth.uid(), to_jsonb(old), to_jsonb(new));
    elsif (old.user_id is distinct from new.user_id and new.user_id is not null) then
      insert into public.shift_history (shift_id, shop_id, action, changed_by, old_data, new_data)
      values (new.id, new.shop_id, 'assign', auth.uid(), to_jsonb(old), to_jsonb(new));
    elsif (old.user_id is not null and new.user_id is null) then
      insert into public.shift_history (shift_id, shop_id, action, changed_by, old_data, new_data)
      values (new.id, new.shop_id, 'unassign', auth.uid(), to_jsonb(old), to_jsonb(new));
    else
      insert into public.shift_history (shift_id, shop_id, action, changed_by, old_data, new_data)
      values (new.id, new.shop_id, 'update', auth.uid(), to_jsonb(old), to_jsonb(new));
    end if;
    return new;
  elsif (TG_OP = 'DELETE') then
    insert into public.shift_history (shift_id, shop_id, action, changed_by, old_data)
    values (old.id, old.shop_id, 'delete', auth.uid(), to_jsonb(old));
    return old;
  end if;
end;
$$;

create trigger shift_audit_trail
  after insert or update or delete on public.shifts
  for each row execute function public.handle_shift_audit();

-- ============================================================
-- REALTIME
-- ============================================================

alter publication supabase_realtime add table public.shifts;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.time_records;
alter publication supabase_realtime add table public.swap_requests;
alter publication supabase_realtime add table public.open_shift_claims;
