UPDATE public.hotel_staff_shifts
SET closed_at = COALESCE(ended_at, opened_at + interval '1 hour', now())
WHERE status = 'closed' AND closed_at IS NULL;