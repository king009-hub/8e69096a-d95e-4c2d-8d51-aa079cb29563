
-- Modifier groups
CREATE TABLE public.hotel_modifier_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  min_select integer NOT NULL DEFAULT 0,
  max_select integer NOT NULL DEFAULT 1,
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_modifier_groups TO authenticated;
GRANT ALL ON public.hotel_modifier_groups TO service_role;
ALTER TABLE public.hotel_modifier_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage modifier groups" ON public.hotel_modifier_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Modifiers (options inside groups)
CREATE TABLE public.hotel_modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.hotel_modifier_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_delta numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_modifiers TO authenticated;
GRANT ALL ON public.hotel_modifiers TO service_role;
ALTER TABLE public.hotel_modifiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage modifiers" ON public.hotel_modifiers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_modifiers_group ON public.hotel_modifiers(group_id);

-- Link menu items to allowed modifier groups
CREATE TABLE public.hotel_service_item_modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_item_id uuid NOT NULL REFERENCES public.hotel_service_menu(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.hotel_modifier_groups(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(service_item_id, group_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_service_item_modifiers TO authenticated;
GRANT ALL ON public.hotel_service_item_modifiers TO service_role;
ALTER TABLE public.hotel_service_item_modifiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage service item modifiers" ON public.hotel_service_item_modifiers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Selections captured at order time
CREATE TABLE public.hotel_order_item_modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES public.hotel_order_items(id) ON DELETE CASCADE,
  modifier_id uuid REFERENCES public.hotel_modifiers(id) ON DELETE SET NULL,
  group_name text NOT NULL,
  modifier_name text NOT NULL,
  price_delta numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_order_item_modifiers TO authenticated;
GRANT ALL ON public.hotel_order_item_modifiers TO service_role;
ALTER TABLE public.hotel_order_item_modifiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage order item modifiers" ON public.hotel_order_item_modifiers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_order_item_modifiers_oi ON public.hotel_order_item_modifiers(order_item_id);

-- Happy hour rules
CREATE TABLE public.hotel_happy_hour_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  days_of_week integer[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  start_time time NOT NULL,
  end_time time NOT NULL,
  discount_percent numeric NOT NULL DEFAULT 0,
  apply_to text NOT NULL DEFAULT 'category', -- 'category' | 'item' | 'all'
  category text,
  service_item_id uuid REFERENCES public.hotel_service_menu(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_happy_hour_rules TO authenticated;
GRANT ALL ON public.hotel_happy_hour_rules TO service_role;
ALTER TABLE public.hotel_happy_hour_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage happy hour" ON public.hotel_happy_hour_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Richer 86'd tracking
ALTER TABLE public.hotel_service_menu
  ADD COLUMN IF NOT EXISTS unavailable_reason text,
  ADD COLUMN IF NOT EXISTS unavailable_until timestamptz;

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_mg_upd BEFORE UPDATE ON public.hotel_modifier_groups FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_m_upd  BEFORE UPDATE ON public.hotel_modifiers       FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_hh_upd BEFORE UPDATE ON public.hotel_happy_hour_rules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
