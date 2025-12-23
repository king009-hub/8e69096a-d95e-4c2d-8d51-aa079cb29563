import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ServiceMenuItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ServiceMenuInsert = Omit<ServiceMenuItem, 'id' | 'created_at' | 'updated_at'>;
export type ServiceMenuUpdate = Partial<ServiceMenuInsert>;

export function useServiceMenu() {
  return useQuery({
    queryKey: ['service-menu'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_service_menu')
        .select('*')
        .order('category')
        .order('sort_order');
      
      if (error) throw error;
      return data as ServiceMenuItem[];
    },
  });
}

export function useAvailableServices() {
  return useQuery({
    queryKey: ['service-menu', 'available'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_service_menu')
        .select('*')
        .eq('is_available', true)
        .order('category')
        .order('sort_order');
      
      if (error) throw error;
      return data as ServiceMenuItem[];
    },
  });
}

export function useAddServiceMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: ServiceMenuInsert) => {
      const { data, error } = await supabase
        .from('hotel_service_menu')
        .insert([item])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-menu'] });
      toast.success('Service item added');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateServiceMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ServiceMenuUpdate }) => {
      const { data, error } = await supabase
        .from('hotel_service_menu')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-menu'] });
      toast.success('Service item updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteServiceMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('hotel_service_menu')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-menu'] });
      toast.success('Service item deleted');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useToggleServiceAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_available }: { id: string; is_available: boolean }) => {
      const { error } = await supabase
        .from('hotel_service_menu')
        .update({ is_available, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-menu'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
