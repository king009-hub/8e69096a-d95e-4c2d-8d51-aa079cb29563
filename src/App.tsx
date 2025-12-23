import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SettingsProvider } from "./contexts/SettingsContext";
import { AuthProvider } from "./contexts/AuthContext";
import { AppModeProvider } from "./contexts/AppModeContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { Layout } from "./components/layout/Layout";
import Index from "./pages/Index";
import Products from "./pages/Products";
import PointOfSale from "./pages/PointOfSale";
import StockManagement from "./pages/StockManagement";
import SalesHistory from "./pages/SalesHistory";
import Reports from "./pages/Reports";
import Scanner from "./pages/Scanner";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import LoanManagement from "./pages/LoanManagement";
import OwnerDashboard from "./pages/OwnerDashboard";
import Customers from "./pages/Customers";
import Auth from "./pages/Auth";
import AdminSetup from "./pages/AdminSetup";
import NotFound from "./pages/NotFound";

// Hotel pages
import HotelDashboard from "./pages/hotel/HotelDashboard";
import HotelRooms from "./pages/hotel/HotelRooms";
import HotelBookings from "./pages/hotel/HotelBookings";
import NewBooking from "./pages/hotel/NewBooking";
import HotelCheckInOut from "./pages/hotel/HotelCheckInOut";
import HotelGuests from "./pages/hotel/HotelGuests";
import HotelBilling from "./pages/hotel/HotelBilling";
import HotelHousekeeping from "./pages/hotel/HotelHousekeeping";
import HotelStaff from "./pages/hotel/HotelStaff";
import HotelReports from "./pages/hotel/HotelReports";
import HotelSettings from "./pages/hotel/HotelSettings";
import HotelServiceMenu from "./pages/hotel/HotelServiceMenu";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SettingsProvider>
        <AppModeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin-setup" element={<AdminSetup />} />
                
                {/* POS Routes */}
                <Route path="/" element={<ProtectedRoute><Layout><Index /></Layout></ProtectedRoute>} />
                <Route path="/owner" element={<ProtectedRoute><Layout><OwnerDashboard /></Layout></ProtectedRoute>} />
                <Route path="/products" element={<ProtectedRoute><Layout><Products /></Layout></ProtectedRoute>} />
                <Route path="/pos" element={<ProtectedRoute><PointOfSale /></ProtectedRoute>} />
                <Route path="/stock" element={<ProtectedRoute><StockManagement /></ProtectedRoute>} />
                <Route path="/sales" element={<ProtectedRoute><SalesHistory /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/scanner" element={<ProtectedRoute><Scanner /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/loans" element={<ProtectedRoute><LoanManagement /></ProtectedRoute>} />
                <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
                
                {/* Hotel Routes */}
                <Route path="/hotel" element={<ProtectedRoute><HotelDashboard /></ProtectedRoute>} />
                <Route path="/hotel/rooms" element={<ProtectedRoute><HotelRooms /></ProtectedRoute>} />
                <Route path="/hotel/bookings" element={<ProtectedRoute><HotelBookings /></ProtectedRoute>} />
                <Route path="/hotel/bookings/new" element={<ProtectedRoute><NewBooking /></ProtectedRoute>} />
                <Route path="/hotel/check-in-out" element={<ProtectedRoute><HotelCheckInOut /></ProtectedRoute>} />
                <Route path="/hotel/guests" element={<ProtectedRoute><HotelGuests /></ProtectedRoute>} />
                <Route path="/hotel/billing" element={<ProtectedRoute><HotelBilling /></ProtectedRoute>} />
                <Route path="/hotel/housekeeping" element={<ProtectedRoute><HotelHousekeeping /></ProtectedRoute>} />
                <Route path="/hotel/staff" element={<ProtectedRoute><HotelStaff /></ProtectedRoute>} />
                <Route path="/hotel/reports" element={<ProtectedRoute><HotelReports /></ProtectedRoute>} />
                <Route path="/hotel/service-menu" element={<ProtectedRoute><HotelServiceMenu /></ProtectedRoute>} />
                <Route path="/hotel/settings" element={<ProtectedRoute><HotelSettings /></ProtectedRoute>} />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AppModeProvider>
      </SettingsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
