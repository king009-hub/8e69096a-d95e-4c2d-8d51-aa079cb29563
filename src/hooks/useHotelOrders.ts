import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HotelOrderItem {
  id: string;
  order_id: string;
  service_item_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  status: string;
  created_at: string;
}

export interface HotelOrder {
  id: string;
  order_number: string;
  booking_id: string | null;
  room_id: string | null;
  table_number: string | null;
  waiter_id: string | null;
  status: string;
  notes: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  is_billed: boolean;
  invoice_id: string | null;
  created_at: string;
  updated_at: string;
  items?: HotelOrderItem[];
  waiter?: { id: string; first_name: string; last_name: string; role: string } | null;
  room?: { id: string; room_number: string; room_type: string } | null;
  booking?: { id: string; booking_reference: string; guest?: { first_name: string; last_name: string } | null } | null;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled' | 'billed';

export function useHotelOrders(filters?: { waiterId?: string; status?: string[] }) {
  return useQuery({
    queryKey: ['hotel-orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('hotel_orders')
        .select(`
          *,
          items:hotel_order_items(*),
          waiter:hotel_staff!hotel_orders_waiter_id_fkey(id, first_name, last_name, role),
          room:hotel_rooms!hotel_orders_room_id_fkey(id, room_number, room_type),
          booking:hotel_bookings!hotel_orders_booking_id_fkey(
            id, booking_reference,
            guest:hotel_guests(first_name, last_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (filters?.waiterId) {
        query = query.eq('waiter_id', filters.waiterId);
      }
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as HotelOrder[];
    },
    refetchInterval: 10000, // Auto-refresh every 10s for real-time order tracking
  });
}

export function useActiveOrders() {
  return useHotelOrders({ status: ['pending', 'preparing', 'ready', 'served'] });
}

export function useWaiterOrders(waiterId: string | undefined) {
  return useHotelOrders(waiterId ? { waiterId, status: ['pending', 'preparing', 'ready', 'served'] } : undefined);
}

interface PlaceOrderParams {
  bookingId?: string | null;
  roomId?: string | null;
  tableNumber?: string | null;
  waiterId: string;
  notes?: string;
  taxRate: number;
  discount?: number;
  items: {
    serviceItemId: string | null;
    name: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }[];
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: PlaceOrderParams) => {
      const subtotal = params.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
      const discountPct = params.discount || 0;
      const discountAmt = (subtotal * discountPct) / 100;
      const taxAmt = (subtotal - discountAmt) * (params.taxRate / 100);
      const totalAmt = subtotal - discountAmt + taxAmt;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('hotel_orders')
        .insert([{
          booking_id: params.bookingId || null,
          room_id: params.roomId || null,
          table_number: params.tableNumber || null,
          waiter_id: params.waiterId,
          notes: params.notes || null,
          subtotal,
          tax_amount: taxAmt,
          discount_amount: discountAmt,
          total_amount: totalAmt,
          status: 'pending',
          order_number: '',
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = params.items.map(item => ({
        order_id: order.id,
        service_item_id: item.serviceItemId,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.quantity * item.unitPrice,
        notes: item.notes || null,
        status: 'pending',
      }));

      const { error: itemsError } = await supabase
        .from('hotel_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Deduct stock for tracked items
      for (const item of params.items) {
        if (item.serviceItemId) {
          const { data: svc } = await supabase
            .from('hotel_service_menu')
            .select('track_stock, stock_quantity, product_id')
            .eq('id', item.serviceItemId)
            .single();

          if (svc?.track_stock) {
            await supabase
              .from('hotel_service_menu')
              .update({ stock_quantity: (svc.stock_quantity || 0) - item.quantity })
              .eq('id', item.serviceItemId);

            await supabase
              .from('hotel_stock_movements')
              .insert([{
                service_item_id: item.serviceItemId,
                quantity: item.quantity,
                movement_type: 'out',
                reason: `Order ${order.order_number}`,
                reference_id: order.id,
              }]);

            if (svc.product_id) {
              const { data: batch } = await supabase
                .from('product_batches')
                .select('id, quantity')
                .eq('product_id', svc.product_id)
                .gt('quantity', 0)
                .order('expiry_date', { ascending: true })
                .limit(1)
                .maybeSingle();

              if (batch) {
                await supabase
                  .from('product_batches')
                  .update({ quantity: batch.quantity - item.quantity })
                  .eq('id', batch.id);
              }
            }
          }
        }
      }

      return order;
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['hotel-orders'] });
      queryClient.invalidateQueries({ queryKey: ['service-menu'] });
      queryClient.invalidateQueries({ queryKey: ['hotel-stock-movements'] });
      toast.success(`Order ${order.order_number} placed successfully!`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to place order: ${error.message}`);
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const { error } = await supabase
        .from('hotel_orders')
        .update({ status })
        .eq('id', orderId);
      if (error) throw error;

      // Also update all items status
      if (status === 'preparing' || status === 'cancelled') {
        await supabase
          .from('hotel_order_items')
          .update({ status })
          .eq('order_id', orderId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-orders'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateOrderItemStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: string }) => {
      const { data: item, error } = await supabase
        .from('hotel_order_items')
        .update({ status })
        .eq('id', itemId)
        .select('order_id')
        .single();
      if (error) throw error;

      // Check if all items are ready → mark order as ready
      if (status === 'ready' && item) {
        const { data: allItems } = await supabase
          .from('hotel_order_items')
          .select('status')
          .eq('order_id', item.order_id);

        const allReady = allItems?.every(i => i.status === 'ready' || i.status === 'served' || i.status === 'cancelled');
        if (allReady) {
          await supabase
            .from('hotel_orders')
            .update({ status: 'ready' })
            .eq('id', item.order_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-orders'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// Bill multiple orders together (order first, bill later)
export function useBillOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderIds,
      bookingId,
      guestId,
      paymentMethod,
      paymentStatus,
    }: {
      orderIds: string[];
      bookingId?: string | null;
      guestId?: string | null;
      paymentMethod?: string;
      paymentStatus?: string;
    }) => {
      // Get all orders
      const { data: orders, error: ordersError } = await supabase
        .from('hotel_orders')
        .select('*, items:hotel_order_items(*)')
        .in('id', orderIds);

      if (ordersError) throw ordersError;

      const totalSubtotal = orders.reduce((s, o) => s + Number(o.subtotal), 0);
      const totalTax = orders.reduce((s, o) => s + Number(o.tax_amount), 0);
      const totalDiscount = orders.reduce((s, o) => s + Number(o.discount_amount), 0);
      const totalAmount = orders.reduce((s, o) => s + Number(o.total_amount), 0);

      // Create invoice
      const dbPaymentMethod = paymentMethod === 'room_charge' ? 'cash' : (paymentMethod || 'cash');
      const { data: invoice, error: invError } = await supabase
        .from('hotel_invoices')
        .insert([{
          booking_id: bookingId || null,
          guest_id: guestId || null,
          subtotal: totalSubtotal,
          tax_amount: totalTax,
          discount_amount: totalDiscount,
          total_amount: totalAmount,
          payment_method: dbPaymentMethod as any,
          payment_status: paymentStatus || 'paid',
          invoice_number: '',
        }])
        .select()
        .single();

      if (invError) throw invError;

      // Add all order items to invoice
      const allItems = orders.flatMap(o =>
        (o.items || []).map((item: any) => ({
          invoice_id: invoice.id,
          description: item.name,
          item_type: 'order',
          unit_price: item.unit_price,
          quantity: item.quantity,
          total_price: item.total_price,
        }))
      );

      if (allItems.length > 0) {
        await supabase.from('hotel_invoice_items').insert(allItems);
      }

      // Mark orders as billed
      await supabase
        .from('hotel_orders')
        .update({ is_billed: true, status: 'billed', invoice_id: invoice.id })
        .in('id', orderIds);

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-orders'] });
      queryClient.invalidateQueries({ queryKey: ['hotel-invoices'] });
      toast.success('Orders billed successfully');
    },
    onError: (error: Error) => toast.error(`Billing failed: ${error.message}`),
  });
}
