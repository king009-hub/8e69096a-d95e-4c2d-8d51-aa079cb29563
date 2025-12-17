import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useHotelRooms, useCreateRoom, useUpdateRoom, useUpdateRoomStatus, useDeleteRoom } from '@/hooks/useHotel';
import { HotelRoom, RoomType, RoomStatus } from '@/types/hotel';
import { Plus, Search, Edit, Trash2, BedDouble, Loader2, Wifi, Tv, Wind, Wine, Bath, Mountain, Users } from 'lucide-react';
import { toast } from 'sonner';

const statusColors: Record<RoomStatus, string> = {
  available: 'bg-green-100 text-green-800 border-green-300',
  occupied: 'bg-blue-100 text-blue-800 border-blue-300',
  reserved: 'bg-amber-100 text-amber-800 border-amber-300',
  maintenance: 'bg-red-100 text-red-800 border-red-300',
  cleaning: 'bg-purple-100 text-purple-800 border-purple-300',
};

const roomTypeLabels: Record<RoomType, string> = {
  single: 'Single',
  double: 'Double',
  suite: 'Suite',
  deluxe: 'Deluxe',
  presidential: 'Presidential',
};

const amenityIcons: Record<string, any> = {
  'WiFi': Wifi,
  'TV': Tv,
  'AC': Wind,
  'Mini Bar': Wine,
  'Jacuzzi': Bath,
  'Balcony': Mountain,
};

export default function HotelRooms() {
  const { data: rooms, isLoading } = useHotelRooms();
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const updateRoomStatus = useUpdateRoomStatus();
  const deleteRoom = useDeleteRoom();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<HotelRoom | null>(null);

  const [formData, setFormData] = useState({
    room_number: '',
    floor: 1,
    room_type: 'single' as RoomType,
    price_per_night: 100,
    capacity: 2,
    amenities: [] as string[],
    description: '',
  });

  const allAmenities = ['WiFi', 'TV', 'AC', 'Mini Bar', 'Jacuzzi', 'Balcony', 'Butler Service', 'Kitchen', 'Work Desk'];

  const filteredRooms = rooms?.filter(room => {
    const matchesSearch = room.room_number.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || room.status === statusFilter;
    const matchesType = typeFilter === 'all' || room.room_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  }) || [];

  const handleSubmit = async () => {
    if (!formData.room_number) {
      toast.error('Room number is required');
      return;
    }

    try {
      if (editingRoom) {
        await updateRoom.mutateAsync({ id: editingRoom.id, ...formData });
      } else {
        await createRoom.mutateAsync(formData);
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const resetForm = () => {
    setFormData({
      room_number: '',
      floor: 1,
      room_type: 'single',
      price_per_night: 100,
      capacity: 2,
      amenities: [],
      description: '',
    });
    setEditingRoom(null);
  };

  const handleEdit = (room: HotelRoom) => {
    setEditingRoom(room);
    setFormData({
      room_number: room.room_number,
      floor: room.floor,
      room_type: room.room_type,
      price_per_night: room.price_per_night,
      capacity: room.capacity,
      amenities: room.amenities,
      description: room.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this room?')) {
      await deleteRoom.mutateAsync(id);
    }
  };

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Room Management</h1>
          <p className="text-muted-foreground">Manage hotel rooms and availability</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Room
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingRoom ? 'Edit Room' : 'Add New Room'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Room Number *</Label>
                  <Input
                    value={formData.room_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, room_number: e.target.value }))}
                    placeholder="e.g., 101"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Floor</Label>
                  <Input
                    type="number"
                    value={formData.floor}
                    onChange={(e) => setFormData(prev => ({ ...prev, floor: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Room Type</Label>
                  <Select value={formData.room_type} onValueChange={(v) => setFormData(prev => ({ ...prev, room_type: v as RoomType }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(roomTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Capacity</Label>
                  <Input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Price per Night ($)</Label>
                <Input
                  type="number"
                  value={formData.price_per_night}
                  onChange={(e) => setFormData(prev => ({ ...prev, price_per_night: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Amenities</Label>
                <div className="flex flex-wrap gap-2">
                  {allAmenities.map(amenity => (
                    <Badge
                      key={amenity}
                      variant={formData.amenities.includes(amenity) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleAmenity(amenity)}
                    >
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Room description..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createRoom.isPending || updateRoom.isPending}>
                  {(createRoom.isPending || updateRoom.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingRoom ? 'Update' : 'Create'} Room
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by room number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="cleaning">Cleaning</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(roomTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Rooms Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredRooms.map(room => (
          <Card key={room.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <BedDouble className="h-16 w-16 text-primary/40" />
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-xl font-bold">Room {room.room_number}</h3>
                  <p className="text-sm text-muted-foreground">Floor {room.floor} • {roomTypeLabels[room.room_type]}</p>
                </div>
                <Badge className={statusColors[room.status]}>
                  {room.status}
                </Badge>
              </div>

              <div className="flex items-center gap-4 mb-3 text-sm">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{room.capacity}</span>
                </div>
                <div className="font-semibold text-primary">
                  ${room.price_per_night}/night
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {room.amenities.slice(0, 4).map(amenity => {
                  const Icon = amenityIcons[amenity];
                  return Icon ? (
                    <div key={amenity} className="p-1.5 bg-muted rounded" title={amenity}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                  ) : null;
                })}
                {room.amenities.length > 4 && (
                  <div className="p-1.5 bg-muted rounded text-xs">+{room.amenities.length - 4}</div>
                )}
              </div>

              <div className="flex gap-2">
                <Select
                  value={room.status}
                  onValueChange={(status) => updateRoomStatus.mutate({ id: room.id, status: status as RoomStatus })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => handleEdit(room)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleDelete(room.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRooms.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <BedDouble className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No rooms found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
