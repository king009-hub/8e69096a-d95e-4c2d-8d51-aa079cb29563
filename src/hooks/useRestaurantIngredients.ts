import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RestaurantIngredient {
  id: string;
  name: string;
  description: string | null;
  purchase_price: number;
  stock_quantity: number;
  min_stock_threshold: number;
  unit: string;
  category: string | null;
  is_liquid: boolean | null;
  volume_per_unit: number | null;
  open_unit_volume: number | null;
  track_empties: boolean | null;
  empty_units_count: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface IngredientMovement {
  id: string;
  ingredient_id: string;
  movement_type: string;
  quantity: number;
  reason: string;
  reference_id: string | null;
  notes: string | null;
  unit_cost: number | null;
  total_cost: number | null;
  created_at: string | null;
  ingredient?: Pick<RestaurantIngredient, 'id' | 'name' | 'unit'> | null;
}

export interface ServiceRecipeItem {
  id: string;
  service_item_id: string;
  ingredient_id: string | null;
  product_id: string | null;
  quantity_required: number;
  unit: string;
  is_extra: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  ingredient?: Pick<RestaurantIngredient, 'id' | 'name' | 'unit' | 'stock_quantity' | 'min_stock_threshold' | 'purchase_price'> | null;
}

export interface WastageLog {
  id: string;
  ingredient_id: string | null;
  service_item_id: string | null;
  product_id: string | null;
  quantity: number;
  reason: string;
  reported_by: string | null;
  notes: string | null;
  created_at: string | null;
  ingredient?: Pick<RestaurantIngredient, 'id' | 'name' | 'unit'> | null;
  service_item?: { id: string; name: string } | null;
}

export type IngredientPayload = Omit<RestaurantIngredient, 'id' | 'created_at' | 'updated_at'>;

export function useRestaurantIngredients() {
  return useQuery({
    queryKey: ['restaurant-ingredients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_ingredients')
        .select('*')
        .order('category')
        .order('name');
      if (error) throw error;
      return (data || []) as RestaurantIngredient[];
    },
  });
}

export function useLowStockIngredients() {
  return useQuery({
    queryKey: ['restaurant-ingredients', 'low-stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_ingredients')
        .select('*')
        .order('name');
      if (error) throw error;
      return ((data || []) as RestaurantIngredient[]).filter(
        (item) => Number(item.stock_quantity) <= Number(item.min_stock_threshold)
      );
    },
  });
}

export function useSaveRestaurantIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ingredient: Partial<RestaurantIngredient> & { name: string }) => {
      const payload: IngredientPayload = {
        name: ingredient.name,
        description: ingredient.description ?? null,
        purchase_price: Number(ingredient.purchase_price) || 0,
        stock_quantity: Number(ingredient.stock_quantity) || 0,
        min_stock_threshold: Number(ingredient.min_stock_threshold) || 0,
        unit: ingredient.unit || 'pcs',
        category: ingredient.category || 'kitchen',
        is_liquid: !!ingredient.is_liquid,
        volume_per_unit: Number(ingredient.volume_per_unit) || 1,
        open_unit_volume: Number(ingredient.open_unit_volume) || 0,
        track_empties: !!ingredient.track_empties,
        empty_units_count: Number(ingredient.empty_units_count) || 0,
      };

      if (ingredient.id) {
        const { data, error } = await supabase
          .from('hotel_ingredients')
          .update(payload)
          .eq('id', ingredient.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from('hotel_ingredients')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-ingredients'] });
      toast.success('Ingredient saved');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteRestaurantIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hotel_ingredients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-ingredients'] });
      toast.success('Ingredient deleted');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useIngredientMovements(ingredientId?: string) {
  return useQuery({
    queryKey: ['restaurant-ingredient-movements', ingredientId],
    queryFn: async () => {
      let query = supabase
        .from('hotel_ingredient_movements')
        .select('*, ingredient:hotel_ingredients(id, name, unit)')
        .order('created_at', { ascending: false })
        .limit(150);

      if (ingredientId) query = query.eq('ingredient_id', ingredientId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as IngredientMovement[];
    },
  });
}

export function useRecordIngredientMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (movement: {
      ingredientId: string;
      movementType: 'in' | 'out' | 'adjustment';
      quantity: number;
      reason: string;
      notes?: string | null;
      unitCost?: number;
    }) => {
      const { data, error } = await (supabase as any).rpc('hotel_record_ingredient_movement', {
        p_ingredient_id: movement.ingredientId,
        p_movement_type: movement.movementType,
        p_quantity: movement.quantity,
        p_reason: movement.reason,
        p_reference_id: null,
        p_notes: movement.notes ?? null,
        p_unit_cost: movement.unitCost ?? 0,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-ingredient-movements'] });
      toast.success('Ingredient stock updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRecipeForServiceItem(serviceItemId?: string) {
  return useQuery({
    queryKey: ['service-item-recipe', serviceItemId],
    enabled: !!serviceItemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_service_item_recipes')
        .select('*, ingredient:hotel_ingredients(id, name, unit, stock_quantity, min_stock_threshold, purchase_price)')
        .eq('service_item_id', serviceItemId!)
        .order('created_at');
      if (error) throw error;
      return (data || []) as ServiceRecipeItem[];
    },
  });
}

export function useSaveRecipeItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recipe: Partial<ServiceRecipeItem> & { service_item_id: string; ingredient_id: string; quantity_required: number; unit: string }) => {
      const payload = {
        service_item_id: recipe.service_item_id,
        ingredient_id: recipe.ingredient_id,
        product_id: null,
        quantity_required: Number(recipe.quantity_required) || 0,
        unit: recipe.unit || 'pcs',
        is_extra: !!recipe.is_extra,
      };

      if (recipe.id) {
        const { data, error } = await supabase
          .from('hotel_service_item_recipes')
          .update(payload)
          .eq('id', recipe.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from('hotel_service_item_recipes')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-item-recipe', variables.service_item_id] });
      queryClient.invalidateQueries({ queryKey: ['service-menu'] });
      toast.success('Recipe saved');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteRecipeItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, serviceItemId }: { id: string; serviceItemId: string }) => {
      const { error } = await supabase.from('hotel_service_item_recipes').delete().eq('id', id);
      if (error) throw error;
      return serviceItemId;
    },
    onSuccess: (serviceItemId) => {
      queryClient.invalidateQueries({ queryKey: ['service-item-recipe', serviceItemId] });
      toast.success('Recipe line removed');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useWastageLog() {
  return useQuery({
    queryKey: ['restaurant-wastage-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_wastage_log')
        .select('*, ingredient:hotel_ingredients(id, name, unit), service_item:hotel_service_menu(id, name)')
        .order('created_at', { ascending: false })
        .limit(150);
      if (error) throw error;
      return (data || []) as WastageLog[];
    },
  });
}

export function useRecordWastage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (waste: {
      ingredientId: string;
      quantity: number;
      reason: string;
      serviceItemId?: string | null;
      notes?: string | null;
    }) => {
      const { data, error } = await (supabase as any).rpc('hotel_record_wastage', {
        p_ingredient_id: waste.ingredientId,
        p_quantity: waste.quantity,
        p_reason: waste.reason,
        p_service_item_id: waste.serviceItemId || null,
        p_notes: waste.notes ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-wastage-log'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-ingredient-movements'] });
      toast.success('Waste recorded');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}