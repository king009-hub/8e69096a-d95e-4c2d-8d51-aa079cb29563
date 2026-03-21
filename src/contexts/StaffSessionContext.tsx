import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ActiveStaff {
  staff_id: string;
  first_name: string;
  last_name: string;
  role: string;
  allowed_hotel_routes: string[];
}

export interface ActiveShift {
  id: string;
  shift_label: string;
  opened_at: string;
  opening_cash: number;
  opening_notes: string | null;
  status: string;
}

interface StaffSessionContextType {
  activeStaff: ActiveStaff | null;
  activeShift: ActiveShift | null;
  isStaffLoggedIn: boolean;
  isShiftOpen: boolean;
  loginWithPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logoutStaff: () => void;
  openShift: (data: { shift_label: string; opening_cash: number; opening_notes?: string }) => Promise<{ success: boolean; error?: string }>;
  closeShift: (data: { closing_cash: number; closing_notes?: string }) => Promise<{ success: boolean; error?: string; report?: any }>;
  checkExistingShift: () => Promise<void>;
}

const StaffSessionContext = createContext<StaffSessionContextType | undefined>(undefined);

export function StaffSessionProvider({ children }: { children: React.ReactNode }) {
  const [activeStaff, setActiveStaff] = useState<ActiveStaff | null>(null);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);

  const checkExistingShift = useCallback(async () => {
    if (!activeStaff) return;
    const { data, error } = await supabase
      .from('hotel_staff_shifts')
      .select('*')
      .eq('staff_id', activeStaff.staff_id)
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setActiveShift({
        id: data.id,
        shift_label: data.shift_label,
        opened_at: data.opened_at,
        opening_cash: data.opening_cash ?? 0,
        opening_notes: data.opening_notes,
        status: data.status,
      });
    }
  }, [activeStaff]);

  const loginWithPin = useCallback(async (pin: string) => {
    try {
      const { data, error } = await supabase.rpc('verify_staff_pin', { staff_pin: pin });
      if (error) throw error;

      const result = data as any;
      if (!result.success) {
        return { success: false, error: result.error };
      }

      const staff: ActiveStaff = {
        staff_id: result.staff_id,
        first_name: result.first_name,
        last_name: result.last_name,
        role: result.role,
        allowed_hotel_routes: result.allowed_hotel_routes || [],
      };
      setActiveStaff(staff);

      // Check for existing open shift
      const { data: shiftData } = await supabase
        .from('hotel_staff_shifts')
        .select('*')
        .eq('staff_id', result.staff_id)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (shiftData) {
        setActiveShift({
          id: shiftData.id,
          shift_label: shiftData.shift_label,
          opened_at: shiftData.opened_at,
          opening_cash: shiftData.opening_cash ?? 0,
          opening_notes: shiftData.opening_notes,
          status: shiftData.status,
        });
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to verify PIN' };
    }
  }, []);

  const logoutStaff = useCallback(() => {
    setActiveStaff(null);
    setActiveShift(null);
  }, []);

  const openShift = useCallback(async (data: { shift_label: string; opening_cash: number; opening_notes?: string }) => {
    if (!activeStaff) return { success: false, error: 'No staff logged in' };
    try {
      const { data: shift, error } = await supabase
        .from('hotel_staff_shifts')
        .insert({
          staff_id: activeStaff.staff_id,
          staff_role: activeStaff.role as any,
          shift_label: data.shift_label,
          opening_cash: data.opening_cash,
          opening_notes: data.opening_notes || null,
          status: 'open',
          opened_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setActiveShift({
        id: shift.id,
        shift_label: shift.shift_label,
        opened_at: shift.opened_at,
        opening_cash: shift.opening_cash ?? 0,
        opening_notes: shift.opening_notes,
        status: shift.status,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [activeStaff]);

  const closeShift = useCallback(async (data: { closing_cash: number; closing_notes?: string }) => {
    if (!activeStaff || !activeShift) return { success: false, error: 'No active shift' };

    try {
      // Gather shift activity summary
      const shiftId = activeShift.id;
      const staffId = activeStaff.staff_id;

      // Get orders created during this shift
      const { data: orders } = await supabase
        .from('hotel_orders')
        .select('*, hotel_order_items(*)')
        .or(`staff_id.eq.${staffId},waiter_id.eq.${staffId}`)
        .gte('created_at', activeShift.opened_at);

      const totalOrders = orders?.length || 0;
      const completedOrders = orders?.filter(o => o.status === 'completed' || o.status === 'delivered').length || 0;
      const totalSales = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      const billedSales = orders?.filter(o => o.is_billed).reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      const totalItems = orders?.reduce((sum, o) => sum + (o.hotel_order_items?.length || 0), 0) || 0;

      // Kitchen vs bar breakdown
      const kitchenItems: Record<string, number> = {};
      const barItems: Record<string, number> = {};
      orders?.forEach(o => {
        o.hotel_order_items?.forEach((item: any) => {
          if (item.item_type === 'beverage' || item.item_type === 'drink') {
            barItems[item.name] = (barItems[item.name] || 0) + item.quantity;
          } else {
            kitchenItems[item.name] = (kitchenItems[item.name] || 0) + item.quantity;
          }
        });
      });

      // Get bookings activity (for receptionist)
      const { data: bookings } = await supabase
        .from('hotel_bookings')
        .select('*')
        .eq('staff_id', staffId)
        .gte('created_at', activeShift.opened_at);

      const checkIns = bookings?.filter(b => b.status === 'checked_in').length || 0;
      const checkOuts = bookings?.filter(b => b.status === 'checked_out').length || 0;

      // Room stats
      const { data: rooms } = await supabase
        .from('hotel_rooms')
        .select('status');

      const occupiedRooms = rooms?.filter(r => r.status === 'occupied').length || 0;
      const availableRooms = rooms?.filter(r => r.status === 'available').length || 0;

      const now = new Date();
      const openedAt = new Date(activeShift.opened_at);
      const durationMs = now.getTime() - openedAt.getTime();
      const hours = Math.floor(durationMs / 3600000);
      const minutes = Math.floor((durationMs % 3600000) / 60000);
      const shiftDuration = `${hours}h ${minutes}m`;

      const expectedCash = (activeShift.opening_cash || 0) + billedSales;
      const difference = data.closing_cash - expectedCash;

      const summary = {
        total_orders: totalOrders,
        completed_orders: completedOrders,
        total_sales: totalSales,
        billed_sales: billedSales,
        total_items: totalItems,
        check_ins: checkIns,
        check_outs: checkOuts,
        occupied_rooms: occupiedRooms,
        available_rooms: availableRooms,
        opening_cash: activeShift.opening_cash,
        closing_cash: data.closing_cash,
        expected_cash: expectedCash,
        difference,
        shift_duration: shiftDuration,
        kitchen_sales: kitchenItems,
        bar_sales: barItems,
      };

      const { error } = await supabase
        .from('hotel_staff_shifts')
        .update({
          status: 'closed',
          closed_at: now.toISOString(),
          ended_at: now.toISOString(),
          closing_cash: data.closing_cash,
          closing_notes: data.closing_notes || null,
          shift_duration: shiftDuration,
          total_orders: totalOrders,
          completed_orders: completedOrders,
          total_sales: totalSales,
          billed_sales: billedSales,
          total_items: totalItems,
          kitchen_sales: kitchenItems,
          bar_sales: barItems,
          shift_check_ins: checkIns,
          shift_check_outs: checkOuts,
          occupied_rooms: occupiedRooms,
          available_rooms: availableRooms,
          expected_cash: expectedCash,
          difference,
          closing_report: JSON.stringify(summary),
          summary,
        })
        .eq('id', shiftId);

      if (error) throw error;

      setActiveShift(null);
      return { success: true, report: summary };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [activeStaff, activeShift]);

  return (
    <StaffSessionContext.Provider value={{
      activeStaff,
      activeShift,
      isStaffLoggedIn: !!activeStaff,
      isShiftOpen: !!activeShift,
      loginWithPin,
      logoutStaff,
      openShift,
      closeShift,
      checkExistingShift,
    }}>
      {children}
    </StaffSessionContext.Provider>
  );
}

export function useStaffSession() {
  const context = useContext(StaffSessionContext);
  if (!context) {
    throw new Error('useStaffSession must be used within StaffSessionProvider');
  }
  return context;
}
