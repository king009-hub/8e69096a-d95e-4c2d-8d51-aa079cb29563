import React from 'react';

// Hotel-only mode. POS and Restaurant modes have been removed; this
// context is kept as a stable shim so existing imports keep working.
export type AppMode = 'hotel';

interface AppModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

const HOTEL_CONTEXT: AppModeContextType = {
  mode: 'hotel',
  setMode: () => {},
};

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useAppMode(): AppModeContextType {
  return HOTEL_CONTEXT;
}
