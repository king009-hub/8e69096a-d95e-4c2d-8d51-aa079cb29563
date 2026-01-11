import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useUserRoles, useUpdateUserRole } from "@/hooks/useSettings";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { Plus, Edit, UserCheck, UserX, Loader2, Search, Mail, Shield, History, Users, Briefcase, UserCog, ShoppingCart, Building } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const userRoleSchema = z.object({
  user_email: z.string().email("Valid email is required"),
  role: z.string().min(1, "Role is required"),
  reason: z.string().optional(),
});

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield,
  Users,
  Briefcase,
  UserCheck,
  UserCog,
  ShoppingCart,
  Building,
};

function getIconComponent(iconName: string | null) {
  return iconMap[iconName || 'Shield'] || Shield;
}

function getRoleColorClass(color: string | null) {
  const colorMap: Record<string, string> = {
    destructive: 'text-red-500',
    secondary: 'text-blue-500',
    success: 'text-green-500',
    warning: 'text-orange-500',
    purple: 'text-purple-500',
    default: 'text-muted-foreground',
  };
  return colorMap[color || 'default'] || 'text-muted-foreground';
}

export function UserManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchingUser, setSearchingUser] = useState(false);
  const [foundUser, setFoundUser] = useState<{ user_id: string; email: string; created_at: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ user: any; role: string; reason?: string } | null>(null);
  const { data: userRoles, isLoading } = useUserRoles();
  const { data: rolePermissions, isLoading: rolesLoading } = useRolePermissions();
  const updateUserRole = useUpdateUserRole();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof userRoleSchema>>({
    resolver: zodResolver(userRoleSchema),
    defaultValues: {
      user_email: "",
      role: "user",
      reason: "",
    },
  });

  const searchUserByEmail = async (email: string) => {
    if (!email.trim()) return;
    
    setSearchingUser(true);
    try {
      const { data, error } = await supabase.rpc('get_user_by_email', { user_email: email.trim() });
      
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        setFoundUser(null);
        return;
      }
      
      if (data && data.length > 0) {
        setFoundUser(data[0]);
        toast({
          title: "User Found",
          description: `Found user: ${data[0].email}`,
        });
      } else {
        setFoundUser(null);
        toast({
          title: "User Not Found", 
          description: "No user found with this email address",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search for user",
        variant: "destructive",
      });
      setFoundUser(null);
    } finally {
      setSearchingUser(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof userRoleSchema>) => {
    if (!foundUser) {
      toast({
        title: "Error",
        description: "Please search and select a user first",
        variant: "destructive",
      });
      return;
    }

    setConfirmAction({
      user: foundUser,
      role: values.role,
      reason: values.reason
    });
  };

  const confirmRoleAssignment = async () => {
    if (!confirmAction) return;

    try {
      await updateUserRole.mutateAsync({
        user_id: confirmAction.user.user_id,
        role: confirmAction.role,
        permissions: getRolePermissionsForUser(confirmAction.role),
      });
      
      toast({
        title: "Success",
        description: `Role assigned successfully to ${confirmAction.user.email}`,
      });
      
      setIsAddDialogOpen(false);
      setFoundUser(null);
      setConfirmAction(null);
      form.reset();
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to assign role",
        variant: "destructive",
      });
    }
  };

  const getRolePermissionsForUser = (role: string): string[] => {
    const roleData = rolePermissions?.find(r => r.role === role);
    if (roleData) {
      return [...roleData.pos_routes, ...roleData.hotel_routes];
    }
    // Fallback for system roles
    switch (role) {
      case "admin":
        return ["all"];
      case "manager":
        return ["products", "sales", "reports", "stock"];
      case "cashier":
        return ["pos", "customers"];
      default:
        return ["pos"];
    }
  };

  const getRoleColor = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    const roleData = rolePermissions?.find(r => r.role === role);
    if (roleData?.color) {
      if (roleData.color === 'destructive') return 'destructive';
      if (roleData.color === 'secondary') return 'secondary';
    }
    // Fallback for system roles
    switch (role) {
      case "admin":
        return "destructive";
      case "manager":
        return "secondary";
      case "cashier":
        return "default";
      default:
        return "outline";
    }
  };

  const getRoleData = (role: string) => {
    return rolePermissions?.find(r => r.role === role);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">User Roles & Permissions</h3>
          <p className="text-sm text-muted-foreground">
            Manage user access levels and permissions
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="hover:bg-blue-600">
              <Plus className="h-4 w-4 mr-2" />
              Add User Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add User Role</DialogTitle>
              <DialogDescription>
                Search for a user by email and assign them a role with appropriate permissions.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="user_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User Email</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            placeholder="Enter user email address" 
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              setFoundUser(null);
                            }}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => searchUserByEmail(field.value)}
                          disabled={searchingUser || !field.value}
                          className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                        >
                          {searchingUser ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <FormMessage />
                      {foundUser && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                          <div className="flex items-center gap-2 text-sm text-green-800">
                            <UserCheck className="h-4 w-4" />
                            <span>Found: {foundUser.email}</span>
                          </div>
                          <div className="text-xs text-green-600 mt-1">
                            User ID: {foundUser.user_id}
                          </div>
                          <div className="text-xs text-green-600">
                            Created: {new Date(foundUser.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rolesLoading ? (
                            <div className="p-2 text-center">
                              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            </div>
                          ) : (
                            rolePermissions?.map((role) => {
                              const Icon = getIconComponent(role.icon);
                              const colorClass = getRoleColorClass(role.color);
                              return (
                                <SelectItem key={role.role} value={role.role}>
                                  <div className="flex items-center gap-2">
                                    <Icon className={`h-4 w-4 ${colorClass}`} />
                                    <span className="capitalize">{role.role}</span>
                                    {!role.is_system && (
                                      <Badge variant="outline" className="text-xs ml-1">Custom</Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              );
                            })
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Reason for role assignment..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={updateUserRole.isPending || !foundUser}
                    className="hover:bg-blue-600"
                  >
                    {updateUserRole.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Assign Role
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Confirmation Dialog */}
        <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Role Assignment</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmAction && (
                  <div className="space-y-2">
                    <p>You are about to assign the role <strong>{confirmAction.role}</strong> to:</p>
                    <div className="bg-gray-50 p-3 rounded border">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{confirmAction.user.email}</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        User ID: {confirmAction.user.user_id}
                      </div>
                    </div>
                    {confirmAction.reason && (
                      <div>
                        <p className="text-sm font-medium">Reason:</p>
                        <p className="text-sm text-gray-600">{confirmAction.reason}</p>
                      </div>
                    )}
                    <p className="text-yellow-600 text-sm mt-2">
                      ⚠️ This action will be logged in the audit trail.
                    </p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmRoleAssignment}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Confirm Assignment
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid gap-4">
        {userRoles && userRoles.length > 0 ? (
          userRoles.map((userRole) => (
            <Card key={userRole.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">
                      User: {userRole.user_id.substring(0, 8)}...
                    </CardTitle>
                  </div>
                  <Badge variant={getRoleColor(userRole.role)}>
                    {userRole.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    <strong>Permissions:</strong> {userRole.permissions && Array.isArray(userRole.permissions) 
                      ? userRole.permissions.join(", ") 
                      : "None"
                    }
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(userRole.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last Updated: {new Date(userRole.updated_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <UserX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No user roles configured</h3>
                <p className="text-sm text-muted-foreground">
                  Add user roles to manage access permissions
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Role Descriptions & Permissions
          </CardTitle>
          <CardDescription>
            Understanding different user roles and their access levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-red-500" />
                <div>
                  <div className="font-medium">Administrator</div>
                  <div className="text-sm text-muted-foreground">Complete system access, user management, sensitive settings</div>
                </div>
              </div>
              <Badge variant="destructive">Admin</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <UserCheck className="h-8 w-8 text-blue-500" />
                <div>
                  <div className="font-medium">Manager</div>
                  <div className="text-sm text-muted-foreground">Products, sales, reports, stock management</div>
                </div>
              </div>
              <Badge variant="secondary">Manager</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <UserCheck className="h-8 w-8 text-green-500" />
                <div>
                  <div className="font-medium">Cashier</div>
                  <div className="text-sm text-muted-foreground">Point of sale operations and customer management</div>
                </div>
              </div>
              <Badge variant="default">Cashier</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <UserCheck className="h-8 w-8 text-gray-500" />
                <div>
                  <div className="font-medium">User</div>
                  <div className="text-sm text-muted-foreground">Basic point of sale access only</div>
                </div>
              </div>
              <Badge variant="outline">User</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}