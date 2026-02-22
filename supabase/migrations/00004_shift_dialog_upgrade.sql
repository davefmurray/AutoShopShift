-- Migration: Shift Dialog Upgrade
-- Adds color, structured breaks, tags, and recurrence support to shifts

-- 1. Add columns to shifts
ALTER TABLE public.shifts ADD COLUMN color text;
ALTER TABLE public.shifts ADD COLUMN recurrence_group_id uuid;

CREATE INDEX idx_shifts_recurrence_group ON public.shifts(recurrence_group_id)
  WHERE recurrence_group_id IS NOT NULL;

-- 2. Planned breaks per shift (separate from time_records breaks)
CREATE TABLE public.shift_breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Break',
  duration_minutes integer NOT NULL DEFAULT 30,
  is_paid boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shift_breaks_shift ON public.shift_breaks(shift_id);

ALTER TABLE public.shift_breaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shift_breaks_select" ON public.shift_breaks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = shift_breaks.shift_id
        AND public.is_shop_member(s.shop_id)
    )
  );

CREATE POLICY "shift_breaks_insert" ON public.shift_breaks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = shift_breaks.shift_id
        AND public.is_shop_admin(s.shop_id)
    )
  );

CREATE POLICY "shift_breaks_update" ON public.shift_breaks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = shift_breaks.shift_id
        AND public.is_shop_admin(s.shop_id)
    )
  );

CREATE POLICY "shift_breaks_delete" ON public.shift_breaks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = shift_breaks.shift_id
        AND public.is_shop_admin(s.shop_id)
    )
  );

-- 3. Tags system
CREATE TABLE public.shift_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id, name)
);

CREATE INDEX idx_shift_tags_shop ON public.shift_tags(shop_id);

ALTER TABLE public.shift_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shift_tags_select" ON public.shift_tags
  FOR SELECT USING (public.is_shop_member(shop_id));

CREATE POLICY "shift_tags_insert" ON public.shift_tags
  FOR INSERT WITH CHECK (public.is_shop_admin(shop_id));

CREATE POLICY "shift_tags_delete" ON public.shift_tags
  FOR DELETE USING (public.is_shop_admin(shop_id));

-- 4. Shift-tag assignments (join table)
CREATE TABLE public.shift_tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.shift_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shift_id, tag_id)
);

CREATE INDEX idx_shift_tag_assignments_shift ON public.shift_tag_assignments(shift_id);

ALTER TABLE public.shift_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shift_tag_assignments_select" ON public.shift_tag_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = shift_tag_assignments.shift_id
        AND public.is_shop_member(s.shop_id)
    )
  );

CREATE POLICY "shift_tag_assignments_insert" ON public.shift_tag_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = shift_tag_assignments.shift_id
        AND public.is_shop_admin(s.shop_id)
    )
  );

CREATE POLICY "shift_tag_assignments_delete" ON public.shift_tag_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = shift_tag_assignments.shift_id
        AND public.is_shop_admin(s.shop_id)
    )
  );
