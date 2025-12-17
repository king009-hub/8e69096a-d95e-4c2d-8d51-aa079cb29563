import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useHotelHousekeeping, useHotelRooms, useHotelStaff, useCreateHousekeepingTask, useUpdateHousekeepingTask, useUpdateRoomStatus } from '@/hooks/useHotel';
import { HousekeepingStatus } from '@/types/hotel';
import { Plus, Loader2, Sparkles, Wrench, WashingMachine, CheckCircle, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const statusColors: Record<HousekeepingStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  verified: 'bg-purple-100 text-purple-800',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const taskTypeIcons: Record<string, any> = {
  cleaning: Sparkles,
  maintenance: Wrench,
  laundry: WashingMachine,
};

export default function HotelHousekeeping() {
  const { data: tasks, isLoading } = useHotelHousekeeping();
  const { data: rooms } = useHotelRooms();
  const { data: staff } = useHotelStaff();
  const createTask = useCreateHousekeepingTask();
  const updateTask = useUpdateHousekeepingTask();
  const updateRoomStatus = useUpdateRoomStatus();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    room_id: '',
    assigned_to: '',
    task_type: 'cleaning',
    priority: 'normal',
    notes: '',
  });

  const housekeepingStaff = staff?.filter(s => s.role === 'housekeeping') || [];

  const filteredTasks = tasks?.filter(task => {
    return statusFilter === 'all' || task.status === statusFilter;
  }) || [];

  const handleCreateTask = async () => {
    if (!formData.room_id) {
      toast.error('Please select a room');
      return;
    }

    try {
      await createTask.mutateAsync(formData);
      setIsDialogOpen(false);
      setFormData({
        room_id: '',
        assigned_to: '',
        task_type: 'cleaning',
        priority: 'normal',
        notes: '',
      });
    } catch {
      // Error handled by mutation
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: HousekeepingStatus, roomId: string) => {
    try {
      await updateTask.mutateAsync({ 
        id: taskId, 
        status: newStatus,
        completed_at: newStatus === 'completed' || newStatus === 'verified' ? new Date().toISOString() : null
      });

      // Update room status when cleaning is verified
      if (newStatus === 'verified') {
        await updateRoomStatus.mutateAsync({ id: roomId, status: 'available' });
      }
    } catch {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingCount = tasks?.filter(t => t.status === 'pending').length || 0;
  const inProgressCount = tasks?.filter(t => t.status === 'in_progress').length || 0;
  const completedCount = tasks?.filter(t => t.status === 'completed').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Housekeeping</h1>
          <p className="text-muted-foreground">Manage cleaning and maintenance tasks</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Room *</Label>
                <Select value={formData.room_id} onValueChange={(v) => setFormData(prev => ({ ...prev, room_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms?.map(room => (
                      <SelectItem key={room.id} value={room.id}>
                        Room {room.room_number} - {room.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select value={formData.assigned_to} onValueChange={(v) => setFormData(prev => ({ ...prev, assigned_to: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {housekeepingStaff.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.first_name} {s.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Task Type</Label>
                  <Select value={formData.task_type} onValueChange={(v) => setFormData(prev => ({ ...prev, task_type: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cleaning">Cleaning</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="laundry">Laundry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional instructions..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateTask} disabled={createTask.isPending}>
                  {createTask.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Task
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-yellow-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold">{inProgressCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">{completedCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <User className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Staff Available</p>
              <p className="text-2xl font-bold">{housekeepingStaff.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tasks Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTasks.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No tasks found</p>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map(task => {
            const TaskIcon = taskTypeIcons[task.task_type] || Sparkles;
            return (
              <Card key={task.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <TaskIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold">Room {task.room?.room_number}</p>
                        <p className="text-sm text-muted-foreground capitalize">{task.task_type}</p>
                      </div>
                    </div>
                    <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
                  </div>

                  {task.staff && (
                    <p className="text-sm mb-2">
                      <span className="text-muted-foreground">Assigned to:</span> {task.staff.first_name} {task.staff.last_name}
                    </p>
                  )}

                  {task.notes && (
                    <p className="text-sm text-muted-foreground mb-3">{task.notes}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(task.scheduled_date), 'MMM dd, yyyy')}
                    </p>
                    <Select
                      value={task.status}
                      onValueChange={(status) => handleStatusChange(task.id, status as HousekeepingStatus, task.room_id)}
                    >
                      <SelectTrigger className="w-[130px]">
                        <Badge className={statusColors[task.status]}>{task.status.replace('_', ' ')}</Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
