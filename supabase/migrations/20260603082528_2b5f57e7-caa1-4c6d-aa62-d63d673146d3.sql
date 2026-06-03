ALTER TABLE public.hotel_staff_shifts DROP CONSTRAINT hotel_staff_shifts_status_check;
ALTER TABLE public.hotel_staff_shifts ADD CONSTRAINT hotel_staff_shifts_status_check
  CHECK (status = ANY (ARRAY['PENDING','ACTIVE','CLOSED','REVIEWED','pending','active','closed','reviewed','open','OPEN']));