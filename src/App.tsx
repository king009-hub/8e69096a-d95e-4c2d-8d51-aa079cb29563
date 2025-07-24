import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import Index from "./pages/Index";
import Products from "./pages/Products";
import { PointOfSale } from "./pages/PointOfSale";
import { StockManagement } from "./pages/StockManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/products" element={<Layout><Products /></Layout>} />
          <Route path="/pos" element={<PointOfSale />} />
          <Route path="/stock" element={<StockManagement />} />
          <Route path="/sales" element={<Layout><div className="p-8"><h1 className="text-3xl font-bold">Sales History</h1><p className="text-muted-foreground">Coming soon...</p></div></Layout>} />
          <Route path="/reports" element={<Layout><div className="p-8"><h1 className="text-3xl font-bold">Reports</h1><p className="text-muted-foreground">Coming soon...</p></div></Layout>} />
          <Route path="/scanner" element={<Layout><div className="p-8"><h1 className="text-3xl font-bold">Barcode Scanner</h1><p className="text-muted-foreground">Coming soon...</p></div></Layout>} />
          <Route path="/notifications" element={<Layout><div className="p-8"><h1 className="text-3xl font-bold">Notifications</h1><p className="text-muted-foreground">Coming soon...</p></div></Layout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
