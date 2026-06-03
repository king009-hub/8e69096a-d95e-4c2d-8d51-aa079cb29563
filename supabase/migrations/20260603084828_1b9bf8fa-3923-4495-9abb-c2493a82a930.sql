-- Remove all restaurant-related entries from role and staff route permissions
UPDATE public.role_permissions
SET pos_routes = COALESCE(
  ARRAY(SELECT r FROM unnest(pos_routes) AS r WHERE r NOT LIKE '/restaurant%'),
  ARRAY[]::text[]
),
hotel_routes = COALESCE(
  ARRAY(SELECT r FROM unnest(hotel_routes) AS r WHERE r NOT LIKE '%restaurant%'),
  ARRAY[]::text[]
);

UPDATE public.hotel_staff
SET allowed_hotel_routes = COALESCE(
  ARRAY(SELECT r FROM unnest(allowed_hotel_routes) AS r WHERE r NOT LIKE '%restaurant%'),
  ARRAY[]::text[]
);