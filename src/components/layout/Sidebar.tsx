import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Truck, 
  BarChart3,
  Bell,
  ScanLine,
  CreditCard,
  Settings,
  Shield,
  Users,
  BedDouble,
  CalendarDays,
  UserCheck,
  Receipt,
  Sparkles,
  Building,
  Hotel,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAppMode } from "@/contexts/AppModeContext";
import { ModeSwitcher } from "@/components/common/ModeSwitcher";

const posNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Products", href: "/products", icon: Package },
  { name: "Point of Sale", href: "/pos", icon: ShoppingCart },
  { name: "Stock Management", href: "/stock", icon: Truck },
  { name: "Sales History", href: "/sales", icon: TrendingUp },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Scanner", href: "/scanner", icon: ScanLine },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Loan Management", href: "/loans", icon: CreditCard },
  { name: "Settings", href: "/settings", icon: Settings },
];

const hotelNavigation = [
  { name: "Dashboard", href: "/hotel", icon: LayoutDashboard },
  { name: "Point of Sale", href: "/hotel/pos", icon: ShoppingCart },
  { name: "Rooms", href: "/hotel/rooms", icon: BedDouble },
  { name: "Bookings", href: "/hotel/bookings", icon: CalendarDays },
  { name: "Check In/Out", href: "/hotel/check-in-out", icon: UserCheck },
  { name: "Guests", href: "/hotel/guests", icon: Users },
  { name: "Billing", href: "/hotel/billing", icon: Receipt },
  { name: "Service Menu", href: "/hotel/service-menu", icon: UtensilsCrossed },
  { name: "Housekeeping", href: "/hotel/housekeeping", icon: Sparkles },
  { name: "Staff", href: "/hotel/staff", icon: Building },
  { name: "Reports", href: "/hotel/reports", icon: BarChart3 },
  { name: "Settings", href: "/hotel/settings", icon: Settings },
];

const ownerNavigation = [
  { name: "Owner Dashboard", href: "/owner", icon: Shield },
];

export function Sidebar() {
  const { userRole } = useAuth();
  const { mode } = useAppMode();
  
  const navigation = mode === 'hotel' ? hotelNavigation : posNavigation;
  const title = mode === 'hotel' ? 'Hotel Manager' : 'StockFlow';
  const subtitle = mode === 'hotel' ? 'Hotel Management' : 'Inventory Management';
  
  return (
    <div className="w-56 md:w-64 bg-card border-r border-border h-screen shadow-lg flex flex-col">
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-2">
          {mode === 'hotel' ? (
            <Hotel className="h-6 w-6 text-primary" />
          ) : (
            <Package className="h-6 w-6 text-primary" />
          )}
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-primary">{title}</h2>
            <p className="text-xs md:text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 mt-2 md:mt-4 px-3 md:px-4 overflow-y-auto">
        {/* Owner Dashboard - Only for admins */}
        {userRole === 'admin' && mode === 'pos' && (
          <div className="mb-4">
            <ul className="space-y-1 md:space-y-2">
              {ownerNavigation.map((item) => (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center px-3 md:px-4 py-2 md:py-3 text-sm font-medium rounded-lg transition-colors border-2 border-primary/30",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-primary hover:text-primary-foreground hover:bg-primary/90"
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3" />
                    <span className="text-xs md:text-sm font-bold">{item.name}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="border-b border-border my-4"></div>
          </div>
        )}

        {/* Regular Navigation */}
        <ul className="space-y-1 md:space-y-2">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center px-3 md:px-4 py-2 md:py-3 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )
                }
              >
                <item.icon className="h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3" />
                <span className="text-xs md:text-sm">{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Mode Switcher at bottom */}
      <div className="p-3 md:p-4 border-t border-border">
        <ModeSwitcher />
      </div>
    </div>
  );
}