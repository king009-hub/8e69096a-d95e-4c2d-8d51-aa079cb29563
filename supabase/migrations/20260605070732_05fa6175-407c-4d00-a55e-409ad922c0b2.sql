
-- 1. Table areas (floor-plan zones)
CREATE TABLE IF NOT EXISTS public.hotel_table_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text DEFAULT '#0ea5e9',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_table_areas TO authenticated;
GRANT ALL ON public.hotel_table_areas TO service_role;

ALTER TABLE public.hotel_table_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view table areas"
  ON public.hotel_table_areas FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Managers can manage table areas"
  ON public.hotel_table_areas FOR ALL
  TO authenticated
  USING (public.is_manager_or_owner())
  WITH CHECK (public.is_manager_or_owner());

CREATE TRIGGER trg_hotel_table_areas_updated_at
  BEFORE UPDATE ON public.hotel_table_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults (idempotent)
INSERT INTO public.hotel_table_areas (name, color, sort_order)
VALUES ('Main Hall', '#0ea5e9', 1),
       ('Terrace',   '#22c55e', 2),
       ('VIP Room',  '#a855f7', 3)
ON CONFLICT (name) DO NOTHING;

-- 2. Floor-plan + area on hotel_tables
ALTER TABLE public.hotel_tables
  ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.hotel_table_areas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pos_x integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pos_y integer NOT NULL DEFAULT 0;

-- 3. Order type + takeaway/delivery info on hotel_orders
DO $$ BEGIN
  CREATE TYPE public.hotel_order_type AS ENUM ('dine_in','takeaway','delivery','room_service');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.hotel_orders
  ADD COLUMN IF NOT EXISTS order_type public.hotel_order_type NOT NULL DEFAULT 'dine_in',
  ADD COLUMN IF NOT EXISTS pickup_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS delivery_fee numeric(12,2) NOT NULL DEFAULT 0;

-- 4. Course on order items
DO $$ BEGIN
  CREATE TYPE public.hotel_course AS ENUM ('none','starter','main','dessert','drinks');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.hotel_order_items
  ADD COLUMN IF NOT EXISTS course public.hotel_course NOT NULL DEFAULT 'none';

-- 5. Secure waiter one-tap payment
CREATE OR REPLACE FUNCTION public.waiter_close_order_payment(
  p_order_id    uuid,
  p_method      text,
  p_amount      numeric,
  p_tip         numeric DEFAULT 0,
  p_reference   text    DEFAULT NULL
) RETURNS public.hotel_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_auth_uid uuid := auth.uid();
  v_staff_id uuid;
  v_order    public.hotel_orders;
  v_already_paid numeric := 0;
BEGIN
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_staff_id
  FROM public.hotel_staff
  WHERE user_id = v_auth_uid AND is_active = true
  LIMIT 1;

  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'No active staff record for caller' USING ERRCODE = '42501';
  END IF;

  IF p_method NOT IN ('cash','momo','card','upi','bank_transfer','room_charge') THEN
    RAISE EXCEPTION 'Invalid payment method: %', p_method USING ERRCODE = '22023';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_order FROM public.hotel_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_order.status = 'settled' THEN
    RETURN v_order;
  END IF;

  SELECT COALESCE(SUM(amount),0) INTO v_already_paid
  FROM public.hotel_payments
  WHERE order_id = p_order_id
    AND COALESCE(status,'posted') NOT IN ('void','refunded');

  IF v_already_paid + p_amount > v_order.total_amount + 0.01 THEN
    RAISE EXCEPTION 'Payment exceeds order total (already paid %, attempting %)',
      v_already_paid, p_amount USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.hotel_payments (
    order_id, amount, payment_method, reference_number, staff_id, shift_id, status, tip_amount
  )
  VALUES (
    p_order_id, p_amount, p_method, p_reference, v_staff_id, v_order.shift_id, 'posted', COALESCE(p_tip,0)
  );

  INSERT INTO public.hotel_shift_transactions (shift_id, staff_id, type, amount, reference_id, notes)
  VALUES (v_order.shift_id, v_staff_id, p_method, p_amount, p_order_id, 'Waiter one-tap payment');

  IF v_already_paid + p_amount >= v_order.total_amount - 0.01 THEN
    UPDATE public.hotel_orders
       SET status     = 'settled',
           settled_at = now()
     WHERE id = p_order_id
    RETURNING * INTO v_order;
  ELSE
    UPDATE public.hotel_orders
       SET status = 'billed'
     WHERE id = p_order_id AND status NOT IN ('settled','billed')
    RETURNING * INTO v_order;
  END IF;

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.waiter_close_order_payment(uuid,text,numeric,numeric,text) TO authenticated;
