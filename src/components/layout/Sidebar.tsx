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
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Products", href: "/products", icon: Package },
  { name: "Point of Sale", href: "/pos", icon: ShoppingCart },
  { name: "Stock Management", href: "/stock", icon: Truck },
  { name: "Sales History", href: "/sales", icon: TrendingUp },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Scanner", href: "/scanner", icon: ScanLine },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  return (
    <div className="w-56 md:w-64 bg-card border-r border-border h-screen shadow-lg">
      <div className="p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-bold text-primary">StockFlow</h2>
        <p className="text-xs md:text-sm text-muted-foreground">Inventory Management</p>
      </div>
      
      <nav className="mt-6 md:mt-8 px-3 md:px-4">
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
    </div>
  );
}