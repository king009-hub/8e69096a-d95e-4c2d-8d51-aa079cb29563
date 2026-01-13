import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { clearPermissionsCache } from '@/lib/permissions';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook that subscribes to real-time updates on role_permissions table.
 * When permissions change, it invalidates the cache and notifies the user.
 */
export function useRealtimePermissions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const channel = supabase
      .channel('role-permissions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'role_permissions',
        },
        (payload) => {
          console.log('Role permissions changed:', payload);
          
          // Clear the permissions cache immediately
          clearPermissionsCache();
          
          // Invalidate React Query cache to refetch
          queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
          
          // Notify user about the change
          const eventType = payload.eventType;
          const roleName = (payload.new as { role?: string })?.role || 
                          (payload.old as { role?: string })?.role || 
                          'Unknown';
          
          let message = '';
          switch (eventType) {
            case 'INSERT':
              message = `New role "${roleName}" has been created.`;
              break;
            case 'UPDATE':
              message = `Permissions for "${roleName}" have been updated.`;
              break;
            case 'DELETE':
              message = `Role "${roleName}" has been deleted.`;
              break;
          }
          
          if (message) {
            toast({
              title: "Permissions Updated",
              description: message,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);
}
