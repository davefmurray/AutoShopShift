-- ============================================================
-- AutoShopShift — Global Activity Log
-- ============================================================

-- ============================================================
-- TABLE
-- ============================================================

CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text,
  action text NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  description text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_activity_log_shop_created
  ON public.activity_log(shop_id, created_at DESC);

CREATE INDEX idx_activity_log_entity
  ON public.activity_log(shop_id, entity_type, created_at DESC);

CREATE INDEX idx_activity_log_actor
  ON public.activity_log(shop_id, actor_id, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_log_select" ON public.activity_log
  FOR SELECT USING (public.is_shop_member(shop_id));

CREATE POLICY "activity_log_insert" ON public.activity_log
  FOR INSERT WITH CHECK (public.is_shop_member(shop_id));

-- ============================================================
-- BRIDGE: shift_history → activity_log
-- ============================================================

CREATE OR REPLACE FUNCTION public.bridge_shift_history_to_activity_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activity_log (shop_id, entity_type, entity_id, action, actor_id, target_user_id, description, metadata)
  VALUES (
    NEW.shop_id,
    'shift',
    NEW.shift_id::text,
    NEW.action::text,
    NEW.changed_by,
    (SELECT user_id FROM public.shifts WHERE id = NEW.shift_id),
    'Shift ' || NEW.action::text,
    jsonb_build_object('old_data', NEW.old_data, 'new_data', NEW.new_data)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bridge_shift_history
  AFTER INSERT ON public.shift_history
  FOR EACH ROW EXECUTE FUNCTION public.bridge_shift_history_to_activity_log();

-- ============================================================
-- FUNCTION: get_activity_log
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_activity_log(
  p_shop_id uuid,
  p_entity_type text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
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
        al.id,
        al.entity_type,
        al.entity_id,
        al.action,
        al.actor_id,
        al.target_user_id,
        al.description,
        al.metadata,
        al.created_at,
        json_build_object('full_name', ap.full_name) AS actor,
        json_build_object('full_name', tp.full_name) AS target_user
      FROM public.activity_log al
      LEFT JOIN public.profiles ap ON ap.id = al.actor_id
      LEFT JOIN public.profiles tp ON tp.id = al.target_user_id
      WHERE al.shop_id = p_shop_id
        AND (p_entity_type IS NULL OR al.entity_type = p_entity_type)
        AND (p_actor_id IS NULL OR al.actor_id = p_actor_id)
      ORDER BY al.created_at DESC
      LIMIT p_limit
      OFFSET p_offset
    ) entries
  );
END;
$$;

-- ============================================================
-- REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;
