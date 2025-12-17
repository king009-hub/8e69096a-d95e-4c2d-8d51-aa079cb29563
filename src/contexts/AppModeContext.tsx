import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppMode = 'pos' | 'hotel';

interface AppModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AppMode>(() => {
    const saved = localStorage.getItem('app-mode');
    return (saved as AppMode) || 'pos';
  });

  useEffect(() => {
    localStorage.setItem('app-mode', mode);
  }, [mode]);

  return (
    <AppModeContext.Provider value={{ mode, setMode }}>
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode() {
  const context = useContext(AppModeContext);
  if (!context) {
    throw new Error('useAppMode must be used within AppModeProvider');
  }
  return context;
}
