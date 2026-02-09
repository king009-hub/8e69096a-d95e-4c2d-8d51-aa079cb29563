
-- Add 'waiter' to the staff_role enum
ALTER TYPE public.staff_role ADD VALUE IF NOT EXISTS 'waiter';

-- Add pin column to hotel_staff (hashed PIN for security)
ALTER TABLE public.hotel_staff ADD COLUMN IF NOT EXISTS pin text DEFAULT NULL;

-- Add allowed_hotel_routes to hotel_staff to control page access per staff role
ALTER TABLE public.hotel_staff ADD COLUMN IF NOT EXISTS allowed_hotel_routes text[] DEFAULT '{}'::text[];

-- Create a function to verify staff PIN (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.verify_staff_pin(staff_pin text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  staff_record record;
BEGIN
  IF staff_pin IS NULL OR staff_pin = '' THEN
    RETURN json_build_object('success', false, 'error', 'PIN is required');
  END IF;
  
  SELECT id, first_name, last_name, role, is_active, allowed_hotel_routes
  INTO staff_record
  FROM public.hotel_staff
  WHERE pin = staff_pin AND is_active = true
  LIMIT 1;
  
  IF staff_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid PIN or inactive staff');
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'staff_id', staff_record.id,
    'first_name', staff_record.first_name,
    'last_name', staff_record.last_name,
    'role', staff_record.role,
    'allowed_hotel_routes', staff_record.allowed_hotel_routes
  );
END;
$$;
