import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HotelTableArea {
  id: string;
  name: string;
  color: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface HotelTable {
  id: string;
  table_number: string;
  name: string | null;
  area: string | null;
  area_id: string | null;
  capacity: number;
  status: 'free' | 'occupied' | 'cleaning' | 'reserved';
  pos_x: number;
  pos_y: number;
  is_active: boolean;
  cleaning_started_at: string | null;
}

export interface HotelTableSession {
  id: string;
  table_id: string;
  table_number: string;
  guest_count: number;
  status: string;
  payment_status: string;
  opened_at: string;
  closed_at: string | null;
}

export function useHotelTableAreas() {
  return useQuery({
    queryKey: ['hotel-table-areas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_table_areas')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as HotelTableArea[];
    },
  });
}

export function useHotelTables() {
  return useQuery({
    queryKey: ['hotel-tables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_tables')
        .select('*')
        .eq('is_active', true)
        .order('table_number', { ascending: true });
      if (error) throw error;
      return (data || []) as HotelTable[];
    },
  });
}

export function useActiveTableSessions() {
  return useQuery({
    queryKey: ['hotel-table-sessions', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_table_sessions')
        .select('*')
        .is('closed_at', null);
      if (error) throw error;
      return (data || []) as HotelTableSession[];
    },
  });
}

export function useHotelTablesRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel('hotel-tables-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_tables' },
        () => qc.invalidateQueries({ queryKey: ['hotel-tables'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_table_sessions' },
        () => qc.invalidateQueries({ queryKey: ['hotel-table-sessions', 'active'] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
}

export function useOpenTableSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { tableId: string; tableNumber: string; guestCount: number; staffId?: string | null; shiftId?: string | null }) => {
      const { data, error } = await supabase
        .from('hotel_table_sessions')
        .insert({
          table_id: input.tableId,
          table_number: input.tableNumber,
          guest_count: input.guestCount,
          status: 'active',
          payment_status: 'pending',
          opened_by: input.staffId ?? null,
          opened_shift_id: input.shiftId ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      await supabase.from('hotel_tables').update({ status: 'occupied' }).eq('id', input.tableId);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hotel-table-sessions', 'active'] });
      qc.invalidateQueries({ queryKey: ['hotel-tables'] });
    },
  });
}

export function useUpdateTableLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; pos_x?: number; pos_y?: number; area_id?: string | null }) => {
      const patch: Record<string, unknown> = {};
      if (input.pos_x !== undefined) patch.pos_x = input.pos_x;
      if (input.pos_y !== undefined) patch.pos_y = input.pos_y;
      if (input.area_id !== undefined) patch.area_id = input.area_id;
      const { error } = await supabase.from('hotel_tables').update(patch).eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotel-tables'] }),
  });
}

export function useWaiterCloseOrderPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { orderId: string; method: string; amount: number; tip?: number; reference?: string }) => {
      const { data, error } = await supabase.rpc('waiter_close_order_payment', {
        p_order_id: input.orderId,
        p_method: input.method,
        p_amount: input.amount,
        p_tip: input.tip ?? 0,
        p_reference: input.reference ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hotel-orders'] });
      qc.invalidateQueries({ queryKey: ['waiter-orders'] });
    },
  });
}