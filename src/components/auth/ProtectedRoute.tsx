import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';
import { hasRouteAccessWithData, UserRole } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { useRolePermissions } from '@/hooks/useRolePermissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRoles }) => {
  const { user, loading, userRole } = useAuth();
  const location = useLocation();
  const { data: rolePermissions, isLoading: permissionsLoading } = useRolePermissions();

  if (loading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check role-based access using database permissions
  const hasAccess = requiredRoles 
    ? requiredRoles.includes(userRole as UserRole)
    : hasRouteAccessWithData(location.pathname, userRole as UserRole, rolePermissions || null);

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <ShieldAlert className="h-16 w-16 mx-auto text-destructive" />
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground max-w-md">
            You don't have permission to access this page. Please contact your administrator if you believe this is an error.
          </p>
          <Button onClick={() => window.history.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};