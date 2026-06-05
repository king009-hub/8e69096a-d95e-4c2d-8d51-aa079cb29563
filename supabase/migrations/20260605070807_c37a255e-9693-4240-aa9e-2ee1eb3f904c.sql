
ALTER TABLE public.hotel_payments
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.hotel_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tip_amount numeric(12,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_hotel_payments_order_id ON public.hotel_payments(order_id);
