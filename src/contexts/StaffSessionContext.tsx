import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ActiveStaff {
  staff_id: string;
  first_name: string;
  last_name: string;
  role: string;
  allowed_hotel_routes: string[];
}

interface StaffSessionContextType {
  activeStaff: ActiveStaff | null;
  isStaffLoggedIn: boolean;
  loginWithPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logoutStaff: () => void;
}

const StaffSessionContext = createContext<StaffSessionContextType | undefined>(undefined);

export function StaffSessionProvider({ children }: { children: React.ReactNode }) {
  const [activeStaff, setActiveStaff] = useState<ActiveStaff | null>(null);

  const loginWithPin = useCallback(async (pin: string) => {
    try {
      const { data, error } = await supabase.rpc('verify_staff_pin', { staff_pin: pin });
      if (error) throw error;

      const result = data as any;
      if (!result.success) {
        return { success: false, error: result.error };
      }

      setActiveStaff({
        staff_id: result.staff_id,
        first_name: result.first_name,
        last_name: result.last_name,
        role: result.role,
        allowed_hotel_routes: result.allowed_hotel_routes || [],
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to verify PIN' };
    }
  }, []);

  const logoutStaff = useCallback(() => {
    setActiveStaff(null);
  }, []);

  return (
    <StaffSessionContext.Provider value={{
      activeStaff,
      isStaffLoggedIn: !!activeStaff,
      loginWithPin,
      logoutStaff,
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
