ALTER TABLE public.hotel_staff_shifts DROP CONSTRAINT IF EXISTS hotel_staff_shifts_status_check;
UPDATE public.hotel_staff_shifts SET status = lower(status) WHERE status <> lower(status);
ALTER TABLE public.hotel_staff_shifts ADD CONSTRAINT hotel_staff_shifts_status_check CHECK (status IN ('open','active','closed','pending','reviewed'));