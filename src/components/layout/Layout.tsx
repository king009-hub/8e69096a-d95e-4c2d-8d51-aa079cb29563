import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { signOut } = useAuth();

  return (
    <div className="flex h-screen bg-background group">
      <div className="fixed left-0 top-0 h-full z-50 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-auto w-full">
        <div className="flex justify-end p-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={signOut}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
        <div className="p-8 pt-0">
          {children}
        </div>
      </main>
    </div>
  );
}