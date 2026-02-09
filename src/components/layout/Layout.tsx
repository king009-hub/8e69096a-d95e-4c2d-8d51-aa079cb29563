import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Package, User, LogIn } from "lucide-react";
import { useRealtimePermissions } from "@/hooks/useRealtimePermissions";
import { useAppMode } from "@/contexts/AppModeContext";
import { useStaffSession } from "@/contexts/StaffSessionContext";
import { StaffPinLogin } from "@/components/hotel/StaffPinLogin";
import { Badge } from "@/components/ui/badge";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { signOut } = useAuth();
  const { mode } = useAppMode();
  const { activeStaff, isStaffLoggedIn, logoutStaff } = useStaffSession();
  
  // Subscribe to real-time permission updates
  useRealtimePermissions();

  // In hotel mode, require staff PIN login
  if (mode === 'hotel' && !isStaffLoggedIn) {
    return <StaffPinLogin />;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop hover zone for sidebar */}
      <div className="hidden md:block fixed left-0 top-0 w-4 h-full z-40 group">
        <div className="fixed left-0 top-0 h-full z-50 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out">
          <Sidebar />
        </div>
      </div>
      
      {/* Mobile/Tablet sidebar toggle */}
      <div className="md:hidden fixed left-2 top-4 z-50">
        <div className="group">
          <Button variant="outline" size="sm" className="mb-2 group-hover:bg-primary group-hover:text-primary-foreground">
            <Package className="h-4 w-4" />
          </Button>
          <div className="absolute left-0 top-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto">
            <Sidebar />
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-auto w-full">
        <div className="flex justify-end items-center gap-2 p-1">
          {/* Show active staff info in hotel mode */}
          {mode === 'hotel' && activeStaff && (
            <div className="flex items-center gap-2 mr-auto ml-2">
              <Badge variant="secondary" className="gap-1 text-xs">
                <User className="h-3 w-3" />
                {activeStaff.first_name} {activeStaff.last_name}
                <span className="text-muted-foreground capitalize">({activeStaff.role})</span>
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={logoutStaff}
                className="gap-1 text-xs h-7"
                title="Switch staff"
              >
                <LogIn className="h-3 w-3" />
                Switch
              </Button>
            </div>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={signOut}
            className="gap-1 text-xs h-7"
          >
            <LogOut className="h-3 w-3" />
            <span className="hidden xs:inline">Sign Out</span>
          </Button>
        </div>
        <div className="px-2 md:px-4">
          {children}
        </div>
      </main>
    </div>
  );
}