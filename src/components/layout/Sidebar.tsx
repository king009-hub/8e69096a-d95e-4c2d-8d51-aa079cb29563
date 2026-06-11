import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  BarChart3,
  Settings,
  Users,
  BedDouble,
  CalendarDays,
  UserCheck,
  Receipt,
  Sparkles,
  Building,
  Hotel,
  UtensilsCrossed,
  ChefHat,
  Wine,
  LayoutGrid,
  SlidersHorizontal,
  Wheat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useStaffSession } from "@/contexts/StaffSessionContext";
import { filterNavigationByRole, UserRole, getRoleDisplayName, setCachedPermissions } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useEffect } from "react";

const hotelNavigation = [
  { name: "Dashboard", href: "/hotel", icon: LayoutDashboard },
  { name: "Point of Sale", href: "/hotel/pos", icon: ShoppingCart },
  { name: "Tables / Floor", href: "/hotel/tables", icon: LayoutGrid },
  { name: "Rooms", href: "/hotel/rooms", icon: BedDouble },
  { name: "Bookings", href: "/hotel/bookings", icon: CalendarDays },
  { name: "Check In/Out", href: "/hotel/check-in-out", icon: UserCheck },
  { name: "Guests", href: "/hotel/guests", icon: Users },
  { name: "Billing", href: "/hotel/billing", icon: Receipt },
  { name: "Service Menu", href: "/hotel/service-menu", icon: UtensilsCrossed },
  { name: "Menu Controls", href: "/hotel/menu-extras", icon: SlidersHorizontal },
  { name: "Ingredients", href: "/hotel/ingredients", icon: Wheat },
  { name: "Kitchen Display", href: "/hotel/kitchen", icon: ChefHat },
  { name: "Bar Display", href: "/hotel/bar", icon: Wine },
  { name: "Housekeeping", href: "/hotel/housekeeping", icon: Sparkles },
  { name: "Staff", href: "/hotel/staff", icon: Building },
  { name: "Reports", href: "/hotel/reports", icon: BarChart3 },
  { name: "Settings", href: "/hotel/settings", icon: Settings },
];

export function Sidebar() {
  const { userRole } = useAuth();
  const { activeStaff } = useStaffSession();
  const { data: rolePermissions } = useRolePermissions();
  
  // Update the permissions cache when database permissions are loaded
  useEffect(() => {
    if (rolePermissions) {
      setCachedPermissions(rolePermissions);
    }
  }, [rolePermissions]);
  
  const baseNavigation = hotelNavigation;
  const title = 'Hotel Manager';
  const subtitle = 'Hotel Management';
  
  // Filter navigation based on user role and database permissions
  let navigation = filterNavigationByRole(baseNavigation, userRole as UserRole, 'hotel', rolePermissions);

  // Further filter by active staff's allowed routes when configured.
  if (activeStaff && activeStaff.allowed_hotel_routes.length > 0) {
    navigation = navigation.filter(item =>
      activeStaff.allowed_hotel_routes.includes(item.href)
    );
  }

  return (
    <div className="w-56 md:w-64 bg-card border-r border-border h-full shadow-lg flex flex-col">
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-2">
          <Hotel className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-primary">{title}</h2>
            <p className="text-xs md:text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {/* User role badge */}
        {userRole && (
          <Badge variant="outline" className="mt-2 text-xs">
            {getRoleDisplayName(userRole as UserRole)}
          </Badge>
        )}
      </div>
      
      <nav className="flex-1 mt-2 md:mt-4 px-3 md:px-4 overflow-y-auto">
        {/* Regular Navigation */}
        <ul className="space-y-1 md:space-y-2">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                end={item.href === '/hotel'}
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
    </div>
  );
}