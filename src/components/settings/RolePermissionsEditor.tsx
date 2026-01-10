import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Shield, Save, RotateCcw, ShoppingCart, Building } from "lucide-react";
import { useRolePermissions, useUpdateRolePermissions, availablePosRoutes, availableHotelRoutes, RolePermission } from "@/hooks/useRolePermissions";
import { useAuth } from "@/contexts/AuthContext";

const roleConfig = {
  admin: { label: 'Administrator', color: 'destructive' as const, icon: Shield },
  manager: { label: 'Manager', color: 'secondary' as const, icon: Shield },
  cashier: { label: 'Cashier', color: 'default' as const, icon: ShoppingCart },
  user: { label: 'User', color: 'outline' as const, icon: Building },
};

export function RolePermissionsEditor() {
  const { userRole } = useAuth();
  const { data: permissions, isLoading } = useRolePermissions();
  const updatePermissions = useUpdateRolePermissions();
  const [editedPermissions, setEditedPermissions] = useState<Record<string, RolePermission>>({});
  const [activeMode, setActiveMode] = useState<'pos' | 'hotel'>('pos');

  // Only admins can edit permissions
  if (userRole !== 'admin') {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Only administrators can manage role permissions.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const getPermission = (role: string): RolePermission | undefined => {
    return editedPermissions[role] || permissions?.find(p => p.role === role);
  };

  const handleRouteToggle = (role: string, route: string, mode: 'pos' | 'hotel') => {
    const current = getPermission(role);
    if (!current) return;

    const routeKey = mode === 'pos' ? 'pos_routes' : 'hotel_routes';
    const currentRoutes = current[routeKey] || [];
    const newRoutes = currentRoutes.includes(route)
      ? currentRoutes.filter(r => r !== route)
      : [...currentRoutes, route];

    setEditedPermissions(prev => ({
      ...prev,
      [role]: {
        ...current,
        [routeKey]: newRoutes,
      },
    }));
  };

  const handleSave = async (role: string) => {
    const permission = getPermission(role);
    if (!permission) return;

    await updatePermissions.mutateAsync({
      role,
      pos_routes: permission.pos_routes,
      hotel_routes: permission.hotel_routes,
      description: permission.description,
    });

    // Clear edited state for this role
    setEditedPermissions(prev => {
      const newState = { ...prev };
      delete newState[role];
      return newState;
    });
  };

  const handleReset = (role: string) => {
    setEditedPermissions(prev => {
      const newState = { ...prev };
      delete newState[role];
      return newState;
    });
  };

  const hasChanges = (role: string): boolean => {
    return !!editedPermissions[role];
  };

  const routes = activeMode === 'pos' ? availablePosRoutes : availableHotelRoutes;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Role Permissions Editor</h3>
          <p className="text-sm text-muted-foreground">
            Customize which pages each role can access
          </p>
        </div>
      </div>

      <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as 'pos' | 'hotel')}>
        <TabsList>
          <TabsTrigger value="pos" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            POS Mode
          </TabsTrigger>
          <TabsTrigger value="hotel" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Hotel Mode
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeMode} className="mt-4">
          <Accordion type="multiple" className="space-y-4">
            {Object.entries(roleConfig).map(([role, config]) => {
              const permission = getPermission(role);
              const currentRoutes = permission?.[activeMode === 'pos' ? 'pos_routes' : 'hotel_routes'] || [];
              const Icon = config.icon;

              return (
                <AccordionItem key={role} value={role} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${role === 'admin' ? 'text-red-500' : role === 'manager' ? 'text-blue-500' : role === 'cashier' ? 'text-green-500' : 'text-gray-500'}`} />
                      <span className="font-medium">{config.label}</span>
                      <Badge variant={config.color}>{role}</Badge>
                      {hasChanges(role) && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                          Unsaved
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground ml-2">
                        ({currentRoutes.length} routes)
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="py-4 space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {routes.map((route) => (
                          <div
                            key={route.path}
                            className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                              currentRoutes.includes(route.path)
                                ? 'bg-primary/5 border-primary/30'
                                : 'bg-muted/30 border-transparent'
                            }`}
                          >
                            <Checkbox
                              id={`${role}-${route.path}`}
                              checked={currentRoutes.includes(route.path)}
                              onCheckedChange={() => handleRouteToggle(role, route.path, activeMode)}
                              disabled={role === 'admin'} // Admin always has all permissions
                            />
                            <div className="space-y-1">
                              <label
                                htmlFor={`${role}-${route.path}`}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {route.label}
                              </label>
                              <p className="text-xs text-muted-foreground">
                                {route.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {role !== 'admin' && (
                        <div className="flex justify-end gap-2 pt-4 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReset(role)}
                            disabled={!hasChanges(role)}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reset
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSave(role)}
                            disabled={!hasChanges(role) || updatePermissions.isPending}
                          >
                            {updatePermissions.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            Save Changes
                          </Button>
                        </div>
                      )}

                      {role === 'admin' && (
                        <p className="text-sm text-muted-foreground italic">
                          Admin role always has access to all routes and cannot be modified.
                        </p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </TabsContent>
      </Tabs>

      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Permission Changes</CardTitle>
          <CardDescription className="text-xs">
            Changes take effect immediately after saving. Users may need to refresh their browser to see updated permissions.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
