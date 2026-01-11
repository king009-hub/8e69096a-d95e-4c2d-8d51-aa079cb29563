import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface RolePermission {
  id: string;
  role: string;
  pos_routes: string[];
  hotel_routes: string[];
  description: string | null;
  is_system: boolean | null;
  color: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

// Available routes for POS mode
export const availablePosRoutes = [
  { path: '/', label: 'Dashboard', description: 'Main dashboard view' },
  { path: '/owner', label: 'Owner Dashboard', description: 'Business owner analytics' },
  { path: '/settings', label: 'Settings', description: 'System configuration' },
  { path: '/reports', label: 'Reports', description: 'Sales and analytics reports' },
  { path: '/stock', label: 'Stock Management', description: 'Inventory control' },
  { path: '/products', label: 'Products', description: 'Product catalog management' },
  { path: '/loans', label: 'Loans', description: 'Customer loan management' },
  { path: '/pos', label: 'Point of Sale', description: 'Sales terminal' },
  { path: '/sales', label: 'Sales History', description: 'View past transactions' },
  { path: '/customers', label: 'Customers', description: 'Customer management' },
  { path: '/scanner', label: 'Scanner', description: 'Barcode scanning' },
  { path: '/notifications', label: 'Notifications', description: 'System alerts' },
];

// Available routes for Hotel mode
export const availableHotelRoutes = [
  { path: '/hotel', label: 'Hotel Dashboard', description: 'Hotel overview' },
  { path: '/hotel/settings', label: 'Hotel Settings', description: 'Hotel configuration' },
  { path: '/hotel/staff', label: 'Staff Management', description: 'Manage hotel staff' },
  { path: '/hotel/reports', label: 'Hotel Reports', description: 'Hotel analytics' },
  { path: '/hotel/billing', label: 'Billing', description: 'Invoice management' },
  { path: '/hotel/service-menu', label: 'Service Menu', description: 'Room service items' },
  { path: '/hotel/pos', label: 'Hotel POS', description: 'Room service orders' },
  { path: '/hotel/rooms', label: 'Rooms', description: 'Room management' },
  { path: '/hotel/bookings', label: 'Bookings', description: 'Reservation management' },
  { path: '/hotel/check-in-out', label: 'Check In/Out', description: 'Guest check-in/out' },
  { path: '/hotel/guests', label: 'Guests', description: 'Guest management' },
  { path: '/hotel/housekeeping', label: 'Housekeeping', description: 'Cleaning tasks' },
];

export function useRolePermissions() {
  return useQuery({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .order('role');
      
      if (error) throw error;
      return data as RolePermission[];
    },
  });
}

export function useRolePermissionByRole(role: string | null) {
  return useQuery({
    queryKey: ['role-permissions', role],
    queryFn: async () => {
      if (!role) return null;
      
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', role)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return data as RolePermission;
    },
    enabled: !!role,
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (permission: Partial<RolePermission> & { role: string }) => {
      const { data, error } = await supabase
        .from('role_permissions')
        .update({
          pos_routes: permission.pos_routes,
          hotel_routes: permission.hotel_routes,
          description: permission.description,
          color: permission.color,
          icon: permission.icon,
          updated_at: new Date().toISOString(),
        })
        .eq('role', permission.role)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast({
        title: "Permissions Updated",
        description: "Role permissions have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update permissions: " + error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      description?: string;
      color?: string;
      icon?: string;
      pos_routes?: string[];
      hotel_routes?: string[];
    }) => {
      const { data, error } = await supabase.rpc('create_custom_role', {
        role_name: params.name,
        role_description: params.description || null,
        role_color: params.color || 'default',
        role_icon: params.icon || 'Shield',
        pos_routes_arr: params.pos_routes || [],
        hotel_routes_arr: params.hotel_routes || [],
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast({
        title: "Role Created",
        description: "Custom role has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create role: " + error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (roleName: string) => {
      const { data, error } = await supabase.rpc('delete_custom_role', {
        role_name: roleName,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast({
        title: "Role Deleted",
        description: "Custom role has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete role: " + error.message,
        variant: "destructive",
      });
    },
  });
}
