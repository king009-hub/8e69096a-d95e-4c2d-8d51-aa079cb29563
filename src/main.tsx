import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { SettingsProvider } from './contexts/SettingsContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </QueryClientProvider>
);
