import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ModifierGroup {
  id: string;
  name: string;
  description: string | null;
  min_select: number;
  max_select: number;
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
  modifiers?: Modifier[];
}

export interface Modifier {
  id: string;
  group_id: string;
  name: string;
  price_delta: number;
  sort_order: number;
  is_default: boolean;
  is_active: boolean;
}

export function useModifierGroups() {
  return useQuery({
    queryKey: ['modifier-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_modifier_groups')
        .select('*, modifiers:hotel_modifiers(*)')
        .order('sort_order');
      if (error) throw error;
      return (data || []) as ModifierGroup[];
    },
  });
}

export function useSaveModifierGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (g: Partial<ModifierGroup> & { name: string }) => {
      const payload = {
        name: g.name,
        description: g.description ?? null,
        min_select: g.min_select ?? 0,
        max_select: g.max_select ?? 1,
        is_required: g.is_required ?? false,
        sort_order: g.sort_order ?? 0,
        is_active: g.is_active ?? true,
      };
      if (g.id) {
        const { error } = await supabase.from('hotel_modifier_groups').update(payload).eq('id', g.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hotel_modifier_groups').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modifier-groups'] });
      toast.success('Modifier group saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteModifierGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hotel_modifier_groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modifier-groups'] });
      toast.success('Group deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSaveModifier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: Partial<Modifier> & { group_id: string; name: string }) => {
      const payload = {
        group_id: m.group_id,
        name: m.name,
        price_delta: m.price_delta ?? 0,
        sort_order: m.sort_order ?? 0,
        is_default: m.is_default ?? false,
        is_active: m.is_active ?? true,
      };
      if (m.id) {
        const { error } = await supabase.from('hotel_modifiers').update(payload).eq('id', m.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hotel_modifiers').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modifier-groups'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteModifier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hotel_modifiers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['modifier-groups'] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

// Set 86'd status on a menu item with optional reason and until-time
export function useToggleItemAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_available, reason, until }: {
      id: string; is_available: boolean; reason?: string | null; until?: string | null;
    }) => {
      const { error } = await supabase
        .from('hotel_service_menu')
        .update({
          is_available,
          unavailable_reason: is_available ? null : (reason ?? null),
          unavailable_until: is_available ? null : (until ?? null),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-menu'] });
      toast.success('Item availability updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}