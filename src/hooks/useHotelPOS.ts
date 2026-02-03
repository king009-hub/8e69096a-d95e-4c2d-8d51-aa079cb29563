import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ServiceMenuItem } from './useServiceMenu';
import { HotelBooking } from '@/types/hotel';

export interface HotelCartItem {
  service: ServiceMenuItem;
  quantity: number;
  unit_price: number;
  notes?: string;
}

export interface HotelPOSPayment {
  method: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'room_charge';
  amount: number;
}

export function useHotelPOS(hotelTaxRate?: number) {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<HotelCartItem[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<HotelBooking | null>(null);
  const [discount, setDiscount] = useState(0);
  const taxRate = hotelTaxRate ?? 18; // Use provided rate or default to 18%

  const addToCart = useCallback((service: ServiceMenuItem, quantity: number = 1) => {
    // Check stock if tracking enabled
    if (service.track_stock && service.stock_quantity < quantity) {
      toast.error(`Insufficient stock for ${service.name}`);
      return false;
    }

    setCart(prev => {
      const existing = prev.find(item => item.service.id === service.id);
      if (existing) {
        const newQty = existing.quantity + quantity;
        if (service.track_stock && service.stock_quantity < newQty) {
          toast.error(`Only ${service.stock_quantity} available`);
          return prev;
        }
        return prev.map(item =>
          item.service.id === service.id
            ? { ...item, quantity: newQty }
            : item
        );
      }
      return [...prev, { service, quantity, unit_price: service.price }];
    });
    return true;
  }, []);

  const updateQuantity = useCallback((serviceId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.service.id !== serviceId));
      return;
    }
    setCart(prev => prev.map(item =>
      item.service.id === serviceId
        ? { ...item, quantity }
        : item
    ));
  }, []);

  const updatePrice = useCallback((serviceId: string, price: number) => {
    setCart(prev => prev.map(item =>
      item.service.id === serviceId
        ? { ...item, unit_price: price }
        : item
    ));
  }, []);

  const removeFromCart = useCallback((serviceId: string) => {
    setCart(prev => prev.filter(item => item.service.id !== serviceId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setSelectedBooking(null);
    setDiscount(0);
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const discountAmount = (subtotal * discount) / 100;
  const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
  const total = subtotal - discountAmount + taxAmount;

  // Charge to room - adds items to guest's folio
  const chargeToRoom = useCallback(async () => {
    if (!selectedBooking) {
      toast.error('Please select a room/booking first');
      return false;
    }

    if (cart.length === 0) {
      toast.error('Cart is empty');
      return false;
    }

    try {
      // Get or create invoice for booking
      let { data: existingInvoice } = await supabase
        .from('hotel_invoices')
        .select('id')
        .eq('booking_id', selectedBooking.id)
        .maybeSingle();

      let invoiceId = existingInvoice?.id;

      if (!invoiceId) {
        const { data: newInvoice, error: invoiceError } = await supabase
          .from('hotel_invoices')
          .insert([{
            booking_id: selectedBooking.id,
            guest_id: selectedBooking.guest_id,
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

      // Add all cart items to invoice
      const invoiceItems = cart.map(item => ({
        invoice_id: invoiceId,
        description: item.service.name,
        item_type: item.service.category,
        unit_price: item.unit_price,
        quantity: item.quantity,
        total_price: item.quantity * item.unit_price,
      }));

      const { error: itemsError } = await supabase
        .from('hotel_invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Deduct stock for tracked items
      for (const item of cart) {
        if (item.service.track_stock) {
          // Deduct from hotel service menu
          await supabase
            .from('hotel_service_menu')
            .update({ 
              stock_quantity: item.service.stock_quantity - item.quantity 
            })
            .eq('id', item.service.id);

          // Record stock movement
          await supabase
            .from('hotel_stock_movements')
            .insert([{
              service_item_id: item.service.id,
              quantity: item.quantity,
              movement_type: 'out',
              reason: 'POS Sale',
              reference_id: invoiceId,
            }]);

          // If linked to main inventory, deduct there too
          if (item.service.product_id) {
            const { data: batch } = await supabase
              .from('product_batches')
              .select('id, quantity')
              .eq('product_id', item.service.product_id)
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

      // Recalculate invoice totals using the correct tax rate
      const { data: allItems } = await supabase
        .from('hotel_invoice_items')
        .select('total_price')
        .eq('invoice_id', invoiceId);

      const newSubtotal = (allItems || []).reduce((sum, i) => sum + Number(i.total_price), 0);
      const newTax = newSubtotal * (taxRate / 100);

      await supabase
        .from('hotel_invoices')
        .update({
          subtotal: newSubtotal,
          tax_amount: newTax,
          total_amount: newSubtotal + newTax,
          discount_amount: discountAmount,
        })
        .eq('id', invoiceId);

      queryClient.invalidateQueries({ queryKey: ['hotel-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['service-menu'] });
      queryClient.invalidateQueries({ queryKey: ['hotel-stock-movements'] });

      toast.success(`Charged to Room ${selectedBooking.room?.room_number || ''}`);
      clearCart();
      return true;
    } catch (error) {
      toast.error('Failed to charge to room');
      console.error(error);
      return false;
    }
  }, [cart, selectedBooking, discountAmount, taxRate, queryClient, clearCart]);

  // Direct payment - instant sale without room charge
  const processDirectPayment = useCallback(async (payments: HotelPOSPayment[]) => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return false;
    }

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid < total - 0.01) {
      toast.error('Insufficient payment amount');
      return false;
    }

    try {
      // Create a standalone invoice (no booking)
      // Map room_charge to cash for database compatibility
      const dbPaymentMethod = payments[0].method === 'room_charge' ? 'cash' : payments[0].method;
      
      const { data: invoice, error: invoiceError } = await supabase
        .from('hotel_invoices')
        .insert([{
          subtotal,
          tax_amount: taxAmount,
          total_amount: total,
          discount_amount: discountAmount,
          payment_status: 'paid',
          payment_method: payments.length > 1 ? 'cash' : dbPaymentMethod,
          notes: selectedBooking ? `Room ${selectedBooking.room?.room_number}` : 'Walk-in',
          invoice_number: '',
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Add items
      const invoiceItems = cart.map(item => ({
        invoice_id: invoice.id,
        description: item.service.name,
        item_type: item.service.category,
        unit_price: item.unit_price,
        quantity: item.quantity,
        total_price: item.quantity * item.unit_price,
      }));

      await supabase.from('hotel_invoice_items').insert(invoiceItems);

      // Deduct stock
      for (const item of cart) {
        if (item.service.track_stock) {
          await supabase
            .from('hotel_service_menu')
            .update({ stock_quantity: item.service.stock_quantity - item.quantity })
            .eq('id', item.service.id);

          await supabase
            .from('hotel_stock_movements')
            .insert([{
              service_item_id: item.service.id,
              quantity: item.quantity,
              movement_type: 'out',
              reason: 'Direct POS Sale',
              reference_id: invoice.id,
            }]);

          if (item.service.product_id) {
            const { data: batch } = await supabase
              .from('product_batches')
              .select('id, quantity')
              .eq('product_id', item.service.product_id)
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

      queryClient.invalidateQueries({ queryKey: ['hotel-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['service-menu'] });

      toast.success(`Payment received - Invoice #${invoice.invoice_number}`);
      clearCart();
      return invoice;
    } catch (error) {
      toast.error('Payment failed');
      console.error(error);
      return false;
    }
  }, [cart, total, subtotal, taxAmount, discountAmount, selectedBooking, queryClient, clearCart]);

  return {
    cart,
    selectedBooking,
    discount,
    subtotal,
    discountAmount,
    taxRate,
    taxAmount,
    total,
    addToCart,
    updateQuantity,
    updatePrice,
    removeFromCart,
    clearCart,
    setSelectedBooking,
    setDiscount,
    chargeToRoom,
    processDirectPayment,
  };
}
