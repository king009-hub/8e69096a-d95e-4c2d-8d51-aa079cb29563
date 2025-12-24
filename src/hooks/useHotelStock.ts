import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HotelStockMovement {
  id: string;
  service_item_id: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  service_item?: {
    id: string;
    name: string;
    category: string;
  };
}

export interface StockMovementInsert {
  service_item_id: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  reference_id?: string;
  notes?: string;
}

export function useHotelStockMovements(serviceItemId?: string) {
  return useQuery({
    queryKey: ['hotel-stock-movements', serviceItemId],
    queryFn: async () => {
      let query = supabase
        .from('hotel_stock_movements')
        .select(`
          *,
          service_item:hotel_service_menu(id, name, category)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (serviceItemId) {
        query = query.eq('service_item_id', serviceItemId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as HotelStockMovement[];
    },
  });
}

export function useAddHotelStockMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (movement: StockMovementInsert) => {
      // First, insert the movement
      const { data: movementData, error: movementError } = await supabase
        .from('hotel_stock_movements')
        .insert([movement])
        .select()
        .single();

      if (movementError) throw movementError;

      // Then update the stock quantity on the service item
      const { data: item } = await supabase
        .from('hotel_service_menu')
        .select('stock_quantity')
        .eq('id', movement.service_item_id)
        .single();

      const currentStock = item?.stock_quantity || 0;
      let newStock = currentStock;

      if (movement.movement_type === 'in') {
        newStock = currentStock + movement.quantity;
      } else if (movement.movement_type === 'out') {
        newStock = Math.max(0, currentStock - movement.quantity);
      } else if (movement.movement_type === 'adjustment') {
        newStock = movement.quantity; // Adjustment sets absolute value
      }

      const { error: updateError } = await supabase
        .from('hotel_service_menu')
        .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
        .eq('id', movement.service_item_id);

      if (updateError) throw updateError;

      return movementData;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hotel-stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['service-menu'] });
      
      const typeLabel = variables.movement_type === 'in' ? 'Stock added' : 
                       variables.movement_type === 'out' ? 'Stock deducted' : 'Stock adjusted';
      toast.success(typeLabel);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// Auto-deduct stock when a service is consumed by a guest
export function useDeductStockForService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      serviceItemId, 
      quantity, 
      bookingId 
    }: { 
      serviceItemId: string; 
      quantity: number; 
      bookingId: string;
    }) => {
      // Check if this service item tracks stock and if it's linked to a product
      const { data: item } = await supabase
        .from('hotel_service_menu')
        .select('id, name, track_stock, stock_quantity, product_id')
        .eq('id', serviceItemId)
        .single();

      if (!item?.track_stock) {
        return null; // No stock tracking for this item
      }

      // Create stock out movement for hotel service menu
      const { error: movementError } = await supabase
        .from('hotel_stock_movements')
        .insert([{
          service_item_id: serviceItemId,
          movement_type: 'out',
          quantity,
          reason: 'Guest consumption',
          reference_id: bookingId,
        }]);

      if (movementError) throw movementError;

      // Update hotel service menu stock quantity
      const newStock = Math.max(0, (item.stock_quantity || 0) - quantity);
      const { error: updateError } = await supabase
        .from('hotel_service_menu')
        .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
        .eq('id', serviceItemId);

      if (updateError) throw updateError;

      // If linked to a main product, also deduct from main inventory
      if (item.product_id) {
        // Get current product stock
        const { data: product } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .single();

        if (product) {
          const newProductStock = Math.max(0, (product.stock_quantity || 0) - quantity);
          
          // Update main product stock
          await supabase
            .from('products')
            .update({ stock_quantity: newProductStock, updated_at: new Date().toISOString() })
            .eq('id', item.product_id);

          // Create stock movement record in main inventory
          await supabase
            .from('stock_movements')
            .insert([{
              product_id: item.product_id,
              movement_type: 'out',
              quantity,
              reason: 'Hotel guest consumption',
              reference_id: bookingId,
              notes: `Service: ${item.name}`,
            }]);
        }
      }

      return { newStock, itemName: item.name, linkedToProduct: !!item.product_id };
    },
    onSuccess: (result) => {
      if (result) {
        queryClient.invalidateQueries({ queryKey: ['hotel-stock-movements'] });
        queryClient.invalidateQueries({ queryKey: ['service-menu'] });
        if (result.linkedToProduct) {
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
        }
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useLowStockItems() {
  return useQuery({
    queryKey: ['service-menu', 'low-stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_service_menu')
        .select('*')
        .eq('track_stock', true)
        .eq('is_available', true);
      
      if (error) throw error;
      
      // Filter items where stock is below threshold
      return data.filter(item => item.stock_quantity <= item.min_stock_threshold);
    },
  });
}
