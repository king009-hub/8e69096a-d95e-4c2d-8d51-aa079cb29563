import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HappyHourRule {
  id: string;
  name: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  discount_percent: number;
  apply_to: 'all' | 'category' | 'item';
  category: string | null;
  service_item_id: string | null;
  is_active: boolean;
}

export function useHappyHourRules() {
  return useQuery({
    queryKey: ['happy-hour-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_happy_hour_rules')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as HappyHourRule[];
    },
  });
}

export function useSaveHappyHour() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: Partial<HappyHourRule> & { name: string; start_time: string; end_time: string }) => {
      const payload = {
        name: r.name,
        days_of_week: r.days_of_week ?? [0,1,2,3,4,5,6],
        start_time: r.start_time,
        end_time: r.end_time,
        discount_percent: r.discount_percent ?? 0,
        apply_to: r.apply_to ?? 'all',
        category: r.category ?? null,
        service_item_id: r.service_item_id ?? null,
        is_active: r.is_active ?? true,
      };
      if (r.id) {
        const { error } = await supabase.from('hotel_happy_hour_rules').update(payload).eq('id', r.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hotel_happy_hour_rules').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['happy-hour-rules'] });
      toast.success('Happy hour rule saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteHappyHour() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hotel_happy_hour_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['happy-hour-rules'] });
      toast.success('Rule deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// Returns the active discount % for an item at a given time (default now)
export function getActiveHappyHourDiscount(
  rules: HappyHourRule[] | undefined,
  item: { id: string; category: string },
  at: Date = new Date()
): number {
  if (!rules || rules.length === 0) return 0;
  const day = at.getDay();
  const hhmm = at.toTimeString().slice(0, 8); // HH:MM:SS
  let best = 0;
  for (const r of rules) {
    if (!r.is_active) continue;
    if (!r.days_of_week?.includes(day)) continue;
    if (hhmm < r.start_time || hhmm > r.end_time) continue;
    if (r.apply_to === 'item' && r.service_item_id !== item.id) continue;
    if (r.apply_to === 'category' && r.category !== item.category) continue;
    if (r.discount_percent > best) best = r.discount_percent;
  }
  return best;
}