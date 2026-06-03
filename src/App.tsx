import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SettingsProvider } from "./contexts/SettingsContext";
import { AuthProvider } from "./contexts/AuthContext";
import { AppModeProvider } from "./contexts/AppModeContext";
import { StaffSessionProvider } from "./contexts/StaffSessionContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { Layout } from "./components/layout/Layout";
import Settings from "./pages/Settings";
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
import HotelPOS from "./pages/hotel/HotelPOS";
import KitchenDisplay from "./pages/hotel/KitchenDisplay";
import BarDisplay from "./pages/hotel/BarDisplay";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SettingsProvider>
        <AppModeProvider>
          <StaffSessionProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin-setup" element={<AdminSetup />} />

                {/* Root redirects to Hotel — system is hotel-only */}
                <Route path="/" element={<Navigate to="/hotel" replace />} />
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
                <Route path="/hotel/pos" element={<ProtectedRoute><HotelPOS /></ProtectedRoute>} />
                <Route path="/hotel/kitchen" element={<ProtectedRoute><KitchenDisplay /></ProtectedRoute>} />
                <Route path="/hotel/bar" element={<ProtectedRoute><BarDisplay /></ProtectedRoute>} />
                <Route path="/hotel/settings" element={<ProtectedRoute><HotelSettings /></ProtectedRoute>} />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
          </StaffSessionProvider>
        </AppModeProvider>
      </SettingsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
