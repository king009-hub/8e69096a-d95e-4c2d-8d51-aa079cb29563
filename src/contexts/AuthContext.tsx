import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  userRole: null,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  const isInvalidRefreshTokenError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error || '');
    return message.includes('Invalid Refresh Token') || message.includes('refresh_token_not_found');
  };

  const clearStoredSupabaseSession = () => {
    if (typeof window === 'undefined') return;
    try {
      const clearFromStorage = (storage: Storage) => {
        Object.keys(storage)
          .filter((key) => key.startsWith('sb-') && key.includes('auth-token'))
          .forEach((key) => storage.removeItem(key));
      };
      clearFromStorage(window.localStorage);
      clearFromStorage(window.sessionStorage);
    } catch (error) {
      console.warn('Unable to clear stored auth session:', error);
    }
  };

  const resetAuthState = () => {
    setSession(null);
    setUser(null);
    setUserRole(null);
  };

  // Fetch user role
  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setUserRole(data?.role || null);
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const applySession = (nextSession: Session | null) => {
      if (!isMounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        setLoading(true);
        void fetchUserRole(nextSession.user.id).finally(() => {
          if (isMounted) setLoading(false);
        });
      } else {
        setUserRole(null);
        setLoading(false);
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (event === 'SIGNED_OUT') {
          resetAuthState();
          setLoading(false);
          return;
        }

        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          applySession(nextSession);
        } else {
          setSession(nextSession);
          setUser(nextSession?.user ?? null);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session: initialSession }, error }) => {
        if (error) {
          if (isInvalidRefreshTokenError(error)) {
            clearStoredSupabaseSession();
            void supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
          } else {
            console.error('Error restoring session:', error);
          }
          applySession(null);
          return;
        }

        applySession(initialSession);
      })
      .catch((error) => {
        if (isInvalidRefreshTokenError(error)) {
          clearStoredSupabaseSession();
          void supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
        } else {
          console.error('Error restoring session:', error);
        }
        if (isMounted) {
          resetAuthState();
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleUnhandledAuthError = (event: PromiseRejectionEvent) => {
      if (isInvalidRefreshTokenError(event.reason)) {
        event.preventDefault();
        clearStoredSupabaseSession();
        resetAuthState();
        setLoading(false);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledAuthError);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledAuthError);
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserRole(null);
  };

  const value = {
    user,
    session,
    loading,
    userRole,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};