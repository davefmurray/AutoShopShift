-- ============================================================
-- AutoShopShift — Seed Data (Development)
-- ============================================================
-- Note: This seed file creates a demo shop and sample data.
-- Users are created via Supabase Auth, so seed data for profiles
-- is inserted directly (bypassing the trigger for development).

-- Demo Shop
insert into public.shops (id, name, address, city, state, zip, phone, timezone, settings) values
  ('a0000000-0000-0000-0000-000000000001', 'Main Street Auto', '123 Main Street', 'Springfield', 'IL', '62701', '(217) 555-0100', 'America/Chicago', '{"weekStartsOn": 0, "defaultView": "week", "clockInRadius": 100}');

-- Positions
insert into public.positions (id, shop_id, name, color, sort_order) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Lead Technician', '#EF4444', 0),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'General Technician', '#3B82F6', 1),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Service Advisor', '#10B981', 2),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Express Lube Tech', '#F59E0B', 3),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Apprentice', '#8B5CF6', 4);

-- Default Schedule
insert into public.schedules (id, shop_id, name, color) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Main Floor', '#6366F1'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Express Lane', '#EC4899');
