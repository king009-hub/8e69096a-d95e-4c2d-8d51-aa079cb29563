import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHotelStaff, useCreateStaff, useUpdateStaff } from "@/hooks/useHotel";
import { Users, Plus, Search, Phone, Mail, Calendar, Clock, Edit, UserCheck, UserX, Lock, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { StaffPinSetup } from "@/components/hotel/StaffPinSetup";

const STAFF_ROLES = ["manager", "receptionist", "housekeeping", "security", "maintenance", "waiter"] as const;
const SHIFTS = ["morning", "afternoon", "night"] as const;

export default function HotelStaff() {
  const { data: staff = [], isLoading } = useHotelStaff();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const { formatCurrency } = useSettingsContext();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [pinSetupStaff, setPinSetupStaff] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "receptionist" as typeof STAFF_ROLES[number],
    shift: "morning",
    salary: 0,
  });

  const filteredStaff = staff.filter(s => {
    const matchesSearch = 
      s.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const activeStaff = filteredStaff.filter(s => s.is_active);
  const inactiveStaff = filteredStaff.filter(s => !s.is_active);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStaff) {
        await updateStaff.mutateAsync({ id: editingStaff.id, ...formData });
        toast.success("Staff member updated");
      } else {
        await createStaff.mutateAsync(formData);
        toast.success("Staff member added");
      }
      setIsAddDialogOpen(false);
      setEditingStaff(null);
      resetForm();
    } catch (error) {
      toast.error("Failed to save staff member");
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      role: "receptionist",
      shift: "morning",
      salary: 0,
    });
  };

  const openEditDialog = (staffMember: any) => {
    setEditingStaff(staffMember);
    setFormData({
      first_name: staffMember.first_name,
      last_name: staffMember.last_name,
      email: staffMember.email || "",
      phone: staffMember.phone || "",
      role: staffMember.role,
      shift: staffMember.shift || "morning",
      salary: staffMember.salary || 0,
    });
    setIsAddDialogOpen(true);
  };

  const toggleStaffStatus = async (staffMember: any) => {
    try {
      await updateStaff.mutateAsync({ 
        id: staffMember.id, 
        is_active: !staffMember.is_active 
      });
      toast.success(`Staff member ${staffMember.is_active ? 'deactivated' : 'activated'}`);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      manager: "bg-purple-500/10 text-purple-500",
      receptionist: "bg-blue-500/10 text-blue-500",
      housekeeping: "bg-green-500/10 text-green-500",
      security: "bg-red-500/10 text-red-500",
      maintenance: "bg-orange-500/10 text-orange-500",
      waiter: "bg-amber-500/10 text-amber-500",
    };
    return colors[role] || "bg-muted text-muted-foreground";
  };

  const StaffTable = ({ staffList }: { staffList: any[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Shift</TableHead>
          <TableHead>PIN</TableHead>
          <TableHead>Hire Date</TableHead>
          <TableHead>Salary</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {staffList.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="font-medium">
              {s.first_name} {s.last_name}
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                {s.email && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {s.email}
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {s.phone}
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge className={getRoleBadgeColor(s.role)}>
                {s.role}
              </Badge>
            </TableCell>
            <TableCell className="capitalize">{s.shift}</TableCell>
            <TableCell>
              {s.pin ? (
                <Badge variant="outline" className="text-green-600 border-green-300">
                  <KeyRound className="h-3 w-3 mr-1" />
                  Set
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Not set
                </Badge>
              )}
            </TableCell>
            <TableCell>
              {s.hire_date ? format(new Date(s.hire_date), "MMM dd, yyyy") : "-"}
            </TableCell>
            <TableCell>{formatCurrency(s.salary || 0)}</TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => openEditDialog(s)} title="Edit">
                  <Edit className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPinSetupStaff(s)} title="PIN & Access">
                  <Lock className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant={s.is_active ? "destructive" : "default"}
                  onClick={() => toggleStaffStatus(s)}
                  title={s.is_active ? 'Deactivate' : 'Activate'}
                >
                  {s.is_active ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Staff Management</h1>
            <p className="text-muted-foreground">Manage hotel staff, PINs, and page access</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) {
              setEditingStaff(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingStaff ? "Edit Staff Member" : "Add New Staff Member"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Role</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: typeof STAFF_ROLES[number]) => setFormData({ ...formData, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAFF_ROLES.map((role) => (
                          <SelectItem key={role} value={role} className="capitalize">
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Shift</Label>
                    <Select
                      value={formData.shift}
                      onValueChange={(value) => setFormData({ ...formData, shift: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SHIFTS.map((shift) => (
                          <SelectItem key={shift} value={shift} className="capitalize">
                            {shift}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Monthly Salary</Label>
                  <Input
                    type="number"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingStaff ? "Update Staff" : "Add Staff"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold">{staff.length}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <UserCheck className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xl font-bold">{staff.filter(s => s.is_active).length}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xl font-bold">{staff.filter(s => s.shift === 'morning').length}</p>
                  <p className="text-xs text-muted-foreground">Morning</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <KeyRound className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xl font-bold">{staff.filter(s => s.pin).length}</p>
                  <p className="text-xs text-muted-foreground">With PIN</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-xl font-bold">{staff.filter(s => s.role === 'manager').length}</p>
                  <p className="text-xs text-muted-foreground">Managers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {STAFF_ROLES.map((role) => (
                <SelectItem key={role} value={role} className="capitalize">
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Staff Tabs */}
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active ({activeStaff.length})</TabsTrigger>
            <TabsTrigger value="inactive">Inactive ({inactiveStaff.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active">
            <Card>
              <CardContent className="pt-6">
                {isLoading ? (
                  <p className="text-center py-8 text-muted-foreground">Loading...</p>
                ) : activeStaff.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No active staff found</p>
                ) : (
                  <StaffTable staffList={activeStaff} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="inactive">
            <Card>
              <CardContent className="pt-6">
                {inactiveStaff.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No inactive staff</p>
                ) : (
                  <StaffTable staffList={inactiveStaff} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* PIN Setup Dialog */}
      {pinSetupStaff && (
        <StaffPinSetup
          open={!!pinSetupStaff}
          onOpenChange={(open) => !open && setPinSetupStaff(null)}
          staffId={pinSetupStaff.id}
          staffName={`${pinSetupStaff.first_name} ${pinSetupStaff.last_name}`}
          currentPin={pinSetupStaff.pin}
          currentRoutes={pinSetupStaff.allowed_hotel_routes || []}
        />
      )}
    </Layout>
  );
}
