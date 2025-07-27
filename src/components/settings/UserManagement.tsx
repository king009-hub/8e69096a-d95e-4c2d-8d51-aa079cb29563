import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useUserRoles, useUpdateUserRole } from "@/hooks/useSettings";
import { Plus, Edit, UserCheck, UserX, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const userRoleSchema = z.object({
  user_id: z.string().min(1, "User ID is required"),
  role: z.string().min(1, "Role is required"),
});

export function UserManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { data: userRoles, isLoading } = useUserRoles();
  const updateUserRole = useUpdateUserRole();

  const form = useForm<z.infer<typeof userRoleSchema>>({
    resolver: zodResolver(userRoleSchema),
    defaultValues: {
      user_id: "",
      role: "user",
    },
  });

  const onSubmit = async (values: z.infer<typeof userRoleSchema>) => {
    await updateUserRole.mutateAsync({
      user_id: values.user_id,
      role: values.role,
      permissions: getRolePermissions(values.role),
    });
    setIsAddDialogOpen(false);
    form.reset();
  };

  const getRolePermissions = (role: string): string[] => {
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

  const getRoleColor = (role: string) => {
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
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add User Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add User Role</DialogTitle>
              <DialogDescription>
                Assign a role to a user. Enter the user ID and select their role.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="user_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter user UUID" {...field} />
                      </FormControl>
                      <FormMessage />
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
                          <SelectItem value="admin">Administrator</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="cashier">Cashier</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={updateUserRole.isPending}>
                    {updateUserRole.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Role
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
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
                      User: {userRole.user_id}
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
          <CardTitle>Role Descriptions</CardTitle>
          <CardDescription>
            Understanding different user roles and their permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <div>
                <div className="font-medium">Administrator</div>
                <div className="text-sm text-muted-foreground">Full system access and configuration</div>
              </div>
              <Badge variant="destructive">Admin</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <div>
                <div className="font-medium">Manager</div>
                <div className="text-sm text-muted-foreground">Manage products, sales, reports, and stock</div>
              </div>
              <Badge variant="secondary">Manager</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <div>
                <div className="font-medium">Cashier</div>
                <div className="text-sm text-muted-foreground">Point of sale and customer management</div>
              </div>
              <Badge variant="default">Cashier</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <div>
                <div className="font-medium">User</div>
                <div className="text-sm text-muted-foreground">Basic point of sale access only</div>
              </div>
              <Badge variant="outline">User</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}