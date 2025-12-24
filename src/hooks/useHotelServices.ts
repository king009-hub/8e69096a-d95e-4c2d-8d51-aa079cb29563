import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { HotelInvoice, HotelPaymentMethod } from '@/types/hotel';
import { toast } from 'sonner';

export interface InvoiceItem {
  id: string;
  invoice_id?: string;
  booking_id?: string;
  description: string;
  item_type: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

// Get invoice items for a booking (stores in hotel_invoice_items linked via booking)
export function useInvoiceItems(bookingId: string) {
  return useQuery({
    queryKey: ['invoice-items', bookingId],
    queryFn: async () => {
      // First check if there's an invoice for this booking
      const { data: invoice } = await supabase
        .from('hotel_invoices')
        .select('id')
        .eq('booking_id', bookingId)
        .maybeSingle();

      if (invoice) {
        const { data, error } = await supabase
          .from('hotel_invoice_items')
          .select('*')
          .eq('invoice_id', invoice.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data as InvoiceItem[];
      }
      return [] as InvoiceItem[];
    },
    enabled: !!bookingId,
  });
}

// Add a service/item for a guest during their stay
export function useAddInvoiceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: {
      booking_id: string;
      description: string;
      item_type: string;
      unit_price: number;
      quantity: number;
      total_price: number;
      service_item_id?: string; // Link to hotel_service_menu for stock tracking
    }) => {
      // First, get or create an invoice for this booking
      let { data: existingInvoice } = await supabase
        .from('hotel_invoices')
        .select('id')
        .eq('booking_id', item.booking_id)
        .maybeSingle();

      let invoiceId = existingInvoice?.id;

      if (!invoiceId) {
        // Get booking details to create invoice
        const { data: booking } = await supabase
          .from('hotel_bookings')
          .select('guest_id')
          .eq('id', item.booking_id)
          .single();

        const { data: newInvoice, error: invoiceError } = await supabase
          .from('hotel_invoices')
          .insert([{
            booking_id: item.booking_id,
            guest_id: booking?.guest_id,
            subtotal: 0,
            tax_amount: 0,
            total_amount: 0,
            payment_status: 'pending',
            invoice_number: '',
          }])
          .select()
          .single();

        if (invoiceError) throw invoiceError;
        invoiceId = newInvoice.id;
      }

      // Add the item
      const { data, error } = await supabase
        .from('hotel_invoice_items')
        .insert([{
          invoice_id: invoiceId,
          description: item.description,
          item_type: item.item_type,
          unit_price: item.unit_price,
          quantity: item.quantity,
          total_price: item.total_price,
        }])
        .select()
        .single();

      if (error) throw error;

      // Update invoice totals
      await recalculateInvoiceTotals(invoiceId);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoice-items', variables.booking_id] });
      queryClient.invalidateQueries({ queryKey: ['hotel-invoices'] });
      toast.success('Service added successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// Delete an invoice item
export function useDeleteInvoiceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      // Get the item to find invoice_id
      const { data: item } = await supabase
        .from('hotel_invoice_items')
        .select('invoice_id')
        .eq('id', itemId)
        .single();

      const { error } = await supabase
        .from('hotel_invoice_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      // Recalculate invoice totals
      if (item?.invoice_id) {
        await recalculateInvoiceTotals(item.invoice_id);
      }

      return item?.invoice_id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-items'] });
      queryClient.invalidateQueries({ queryKey: ['hotel-invoices'] });
      toast.success('Service removed');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// Generate final invoice at checkout
export function useGenerateCheckoutInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      // Get booking with room details
      const { data: booking, error: bookingError } = await supabase
        .from('hotel_bookings')
        .select(`
          *,
          room:hotel_rooms(*)
        `)
        .eq('id', bookingId)
        .single();

      if (bookingError) throw bookingError;

      // Calculate nights
      const checkIn = new Date(booking.check_in_date);
      const checkOut = new Date(booking.check_out_date);
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      const roomCharge = Number(booking.room?.price_per_night || 0) * nights;

      // Get or create invoice
      let { data: existingInvoice } = await supabase
        .from('hotel_invoices')
        .select('id')
        .eq('booking_id', bookingId)
        .maybeSingle();

      let invoiceId = existingInvoice?.id;

      if (!invoiceId) {
        const { data: newInvoice, error: invoiceError } = await supabase
          .from('hotel_invoices')
          .insert([{
            booking_id: bookingId,
            guest_id: booking.guest_id,
            subtotal: 0,
            tax_amount: 0,
            total_amount: 0,
            payment_status: 'pending',
            invoice_number: '',
          }])
          .select()
          .single();

        if (invoiceError) throw invoiceError;
        invoiceId = newInvoice.id;
      }

      // Check if room charge item exists
      const { data: existingRoomCharge } = await supabase
        .from('hotel_invoice_items')
        .select('id')
        .eq('invoice_id', invoiceId)
        .eq('item_type', 'room')
        .maybeSingle();

      if (!existingRoomCharge) {
        // Add room charge as first item
        await supabase
          .from('hotel_invoice_items')
          .insert([{
            invoice_id: invoiceId,
            description: `Room ${booking.room?.room_number} - ${nights} night(s)`,
            item_type: 'room',
            unit_price: booking.room?.price_per_night || 0,
            quantity: nights,
            total_price: roomCharge,
          }]);
      }

      // Recalculate totals
      await recalculateInvoiceTotals(invoiceId);

      // Get final invoice
      const { data: finalInvoice } = await supabase
        .from('hotel_invoices')
        .select(`
          *,
          items:hotel_invoice_items(*)
        `)
        .eq('id', invoiceId)
        .single();

      return finalInvoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-items'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// Process payment
export function useProcessPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      paymentMethod,
      amountPaid,
    }: {
      invoiceId: string;
      paymentMethod: HotelPaymentMethod;
      amountPaid: number;
    }) => {
      const { data: invoice } = await supabase
        .from('hotel_invoices')
        .select('total_amount, booking_id')
        .eq('id', invoiceId)
        .single();

      const totalAmount = Number(invoice?.total_amount || 0);
      const paymentStatus = amountPaid >= totalAmount ? 'paid' : 'partial';

      const { data, error } = await supabase
        .from('hotel_invoices')
        .update({
          payment_method: paymentMethod,
          payment_status: paymentStatus,
        })
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) throw error;

      // Update booking paid_amount
      if (invoice?.booking_id) {
        await supabase
          .from('hotel_bookings')
          .update({ paid_amount: amountPaid })
          .eq('id', invoice.booking_id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['hotel-bookings'] });
      toast.success('Payment processed successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// Update invoice for payment
export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<HotelInvoice> & { id: string }) => {
      const { data, error } = await supabase
        .from('hotel_invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-invoices'] });
      toast.success('Invoice updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// Helper to recalculate invoice totals
async function recalculateInvoiceTotals(invoiceId: string) {
  const { data: items } = await supabase
    .from('hotel_invoice_items')
    .select('total_price')
    .eq('invoice_id', invoiceId);

  const subtotal = (items || []).reduce((sum, item) => sum + Number(item.total_price), 0);
  const taxRate = 0.18; // 18% tax
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;

  await supabase
    .from('hotel_invoices')
    .update({
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
    })
    .eq('id', invoiceId);
}

// Fetch invoice with items for printing
export async function fetchInvoiceWithItems(invoiceId: string) {
  const { data: invoice, error } = await supabase
    .from('hotel_invoices')
    .select(`
      *,
      guest:hotel_guests(*),
      booking:hotel_bookings(
        *,
        room:hotel_rooms(*)
      )
    `)
    .eq('id', invoiceId)
    .single();

  if (error) throw error;

  const { data: items } = await supabase
    .from('hotel_invoice_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at');

  return { ...invoice, items: items || [] };
}
