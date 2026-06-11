GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_ingredients TO authenticated;
GRANT ALL ON public.hotel_ingredients TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_ingredient_movements TO authenticated;
GRANT ALL ON public.hotel_ingredient_movements TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_service_item_recipes TO authenticated;
GRANT ALL ON public.hotel_service_item_recipes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_wastage_log TO authenticated;
GRANT ALL ON public.hotel_wastage_log TO service_role;

CREATE INDEX IF NOT EXISTS idx_hotel_ingredients_low_stock
  ON public.hotel_ingredients (stock_quantity, min_stock_threshold)
  WHERE stock_quantity <= min_stock_threshold;

CREATE INDEX IF NOT EXISTS idx_hotel_ingredient_movements_ingredient_created
  ON public.hotel_ingredient_movements (ingredient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hotel_service_item_recipes_service_item
  ON public.hotel_service_item_recipes (service_item_id);

CREATE INDEX IF NOT EXISTS idx_hotel_wastage_log_ingredient_created
  ON public.hotel_wastage_log (ingredient_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_hotel_ingredients_updated_at ON public.hotel_ingredients;
CREATE TRIGGER trg_hotel_ingredients_updated_at
  BEFORE UPDATE ON public.hotel_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_hotel_service_item_recipes_updated_at ON public.hotel_service_item_recipes;
CREATE TRIGGER trg_hotel_service_item_recipes_updated_at
  BEFORE UPDATE ON public.hotel_service_item_recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.hotel_record_ingredient_movement(
  p_ingredient_id uuid,
  p_movement_type text,
  p_quantity numeric,
  p_reason text,
  p_reference_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_unit_cost numeric DEFAULT 0
)
RETURNS public.hotel_ingredients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current public.hotel_ingredients;
  v_new_quantity numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  IF p_movement_type NOT IN ('in', 'out', 'adjustment') THEN
    RAISE EXCEPTION 'Invalid movement type: %', p_movement_type;
  END IF;

  SELECT * INTO v_current
  FROM public.hotel_ingredients
  WHERE id = p_ingredient_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ingredient not found';
  END IF;

  IF p_movement_type = 'in' THEN
    v_new_quantity := COALESCE(v_current.stock_quantity, 0) + p_quantity;
  ELSIF p_movement_type = 'out' THEN
    IF COALESCE(v_current.stock_quantity, 0) < p_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for %: have %, need %', v_current.name, v_current.stock_quantity, p_quantity;
    END IF;
    v_new_quantity := COALESCE(v_current.stock_quantity, 0) - p_quantity;
  ELSE
    v_new_quantity := p_quantity;
  END IF;

  UPDATE public.hotel_ingredients
  SET stock_quantity = v_new_quantity,
      purchase_price = CASE WHEN p_movement_type = 'in' AND p_unit_cost > 0 THEN p_unit_cost ELSE purchase_price END,
      updated_at = now()
  WHERE id = p_ingredient_id
  RETURNING * INTO v_current;

  INSERT INTO public.hotel_ingredient_movements (
    ingredient_id, movement_type, quantity, reason, reference_id, notes, unit_cost, total_cost
  ) VALUES (
    p_ingredient_id, p_movement_type, p_quantity, p_reason, p_reference_id, p_notes,
    COALESCE(p_unit_cost, 0), COALESCE(p_unit_cost, 0) * p_quantity
  );

  RETURN v_current;
END;
$$;

CREATE OR REPLACE FUNCTION public.hotel_record_wastage(
  p_ingredient_id uuid,
  p_quantity numeric,
  p_reason text,
  p_service_item_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS public.hotel_wastage_log
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ingredient public.hotel_ingredients;
  v_waste public.hotel_wastage_log;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  SELECT * INTO v_ingredient
  FROM public.hotel_ingredients
  WHERE id = p_ingredient_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ingredient not found';
  END IF;

  IF COALESCE(v_ingredient.stock_quantity, 0) < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock for %: have %, need %', v_ingredient.name, v_ingredient.stock_quantity, p_quantity;
  END IF;

  UPDATE public.hotel_ingredients
  SET stock_quantity = stock_quantity - p_quantity,
      updated_at = now()
  WHERE id = p_ingredient_id;

  INSERT INTO public.hotel_ingredient_movements (
    ingredient_id, movement_type, quantity, reason, reference_id, notes, unit_cost, total_cost
  ) VALUES (
    p_ingredient_id, 'out', p_quantity, 'Waste: ' || p_reason, p_service_item_id, p_notes,
    COALESCE(v_ingredient.purchase_price, 0), COALESCE(v_ingredient.purchase_price, 0) * p_quantity
  );

  INSERT INTO public.hotel_wastage_log (
    ingredient_id, service_item_id, quantity, reason, reported_by, notes
  ) VALUES (
    p_ingredient_id, p_service_item_id, p_quantity, p_reason, auth.uid(), p_notes
  ) RETURNING * INTO v_waste;

  RETURN v_waste;
END;
$$;

CREATE OR REPLACE FUNCTION public.hotel_consume_service_recipe(
  p_service_item_id uuid,
  p_quantity numeric,
  p_order_id uuid DEFAULT NULL,
  p_order_item_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipe record;
  v_needed numeric;
  v_current_stock numeric;
  v_consumed jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  FOR v_recipe IN
    SELECT r.id, r.ingredient_id, r.quantity_required, r.unit, i.name, i.stock_quantity, i.purchase_price
    FROM public.hotel_service_item_recipes r
    JOIN public.hotel_ingredients i ON i.id = r.ingredient_id
    WHERE r.service_item_id = p_service_item_id
      AND r.ingredient_id IS NOT NULL
  LOOP
    v_needed := v_recipe.quantity_required * p_quantity;
    v_current_stock := COALESCE(v_recipe.stock_quantity, 0);

    IF v_current_stock < v_needed THEN
      RAISE EXCEPTION 'Insufficient ingredient %: have %, need %', v_recipe.name, v_current_stock, v_needed;
    END IF;
  END LOOP;

  FOR v_recipe IN
    SELECT r.id, r.ingredient_id, r.quantity_required, r.unit, i.name, i.stock_quantity, i.purchase_price
    FROM public.hotel_service_item_recipes r
    JOIN public.hotel_ingredients i ON i.id = r.ingredient_id
    WHERE r.service_item_id = p_service_item_id
      AND r.ingredient_id IS NOT NULL
    FOR UPDATE OF i
  LOOP
    v_needed := v_recipe.quantity_required * p_quantity;

    UPDATE public.hotel_ingredients
    SET stock_quantity = stock_quantity - v_needed,
        updated_at = now()
    WHERE id = v_recipe.ingredient_id;

    INSERT INTO public.hotel_ingredient_movements (
      ingredient_id, movement_type, quantity, reason, reference_id, notes, unit_cost, total_cost
    ) VALUES (
      v_recipe.ingredient_id, 'out', v_needed, 'Recipe consumption', p_order_id,
      COALESCE(p_notes, '') || CASE WHEN p_order_item_id IS NOT NULL THEN ' item=' || p_order_item_id::text ELSE '' END,
      COALESCE(v_recipe.purchase_price, 0), COALESCE(v_recipe.purchase_price, 0) * v_needed
    );

    v_consumed := v_consumed || jsonb_build_object(
      'ingredient_id', v_recipe.ingredient_id,
      'name', v_recipe.name,
      'quantity', v_needed,
      'unit', v_recipe.unit
    );
  END LOOP;

  RETURN jsonb_build_object('service_item_id', p_service_item_id, 'order_id', p_order_id, 'consumed', v_consumed);
END;
$$;

GRANT EXECUTE ON FUNCTION public.hotel_record_ingredient_movement(uuid, text, numeric, text, uuid, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hotel_record_ingredient_movement(uuid, text, numeric, text, uuid, text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.hotel_record_wastage(uuid, numeric, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hotel_record_wastage(uuid, numeric, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.hotel_consume_service_recipe(uuid, numeric, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hotel_consume_service_recipe(uuid, numeric, uuid, uuid, text) TO service_role;