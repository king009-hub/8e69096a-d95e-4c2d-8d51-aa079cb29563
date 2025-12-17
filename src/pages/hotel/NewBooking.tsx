import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useHotelRooms, useHotelGuests, useCreateBooking, useCreateGuest, useUpdateRoomStatus } from '@/hooks/useHotel';
import { HotelGuest, RoomType } from '@/types/hotel';
import { ArrowLeft, CalendarIcon, Loader2, UserPlus, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const roomTypeLabels: Record<RoomType, string> = {
  single: 'Single',
  double: 'Double',
  suite: 'Suite',
  deluxe: 'Deluxe',
  presidential: 'Presidential',
};

export default function NewBooking() {
  const navigate = useNavigate();
  const { data: rooms } = useHotelRooms();
  const { data: guests } = useHotelGuests();
  const createBooking = useCreateBooking();
  const createGuest = useCreateGuest();
  const updateRoomStatus = useUpdateRoomStatus();

  const [checkInDate, setCheckInDate] = useState<Date>();
  const [checkOutDate, setCheckOutDate] = useState<Date>();
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedGuestId, setSelectedGuestId] = useState<string>('');
  const [isNewGuest, setIsNewGuest] = useState(false);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [specialRequests, setSpecialRequests] = useState('');

  const [newGuest, setNewGuest] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    id_proof_type: '',
    id_proof_number: '',
  });

  const availableRooms = rooms?.filter(r => r.status === 'available') || [];
  const selectedRoom = rooms?.find(r => r.id === selectedRoomId);

  const nights = checkInDate && checkOutDate ? differenceInDays(checkOutDate, checkInDate) : 0;
  const roomPrice = selectedRoom ? selectedRoom.price_per_night * nights : 0;
  const taxRate = 0.18;
  const taxAmount = roomPrice * taxRate;
  const totalAmount = roomPrice + taxAmount;

  const handleSubmit = async () => {
    if (!checkInDate || !checkOutDate) {
      toast.error('Please select check-in and check-out dates');
      return;
    }
    if (!selectedRoomId) {
      toast.error('Please select a room');
      return;
    }
    if (nights <= 0) {
      toast.error('Check-out date must be after check-in date');
      return;
    }

    let guestId = selectedGuestId;

    if (isNewGuest) {
      if (!newGuest.first_name || !newGuest.last_name || !newGuest.phone) {
        toast.error('Please fill in guest details');
        return;
      }
      try {
        const guest = await createGuest.mutateAsync(newGuest);
        guestId = guest.id;
      } catch {
        return;
      }
    }

    if (!guestId) {
      toast.error('Please select or create a guest');
      return;
    }

    try {
      await createBooking.mutateAsync({
        guest_id: guestId,
        room_id: selectedRoomId,
        check_in_date: format(checkInDate, 'yyyy-MM-dd'),
        check_out_date: format(checkOutDate, 'yyyy-MM-dd'),
        adults,
        children,
        special_requests: specialRequests,
        total_amount: totalAmount,
        status: 'confirmed',
      });

      await updateRoomStatus.mutateAsync({ id: selectedRoomId, status: 'reserved' });
      
      navigate('/hotel/bookings');
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/hotel/bookings')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Booking</h1>
          <p className="text-muted-foreground">Create a new reservation</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Date Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Dates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Check-in Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left", !checkInDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {checkInDate ? format(checkInDate, 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={checkInDate}
                        onSelect={setCheckInDate}
                        disabled={(date) => date < new Date()}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Check-out Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left", !checkOutDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {checkOutDate ? format(checkOutDate, 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={checkOutDate}
                        onSelect={setCheckOutDate}
                        disabled={(date) => date <= (checkInDate || new Date())}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Room Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Room Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableRooms.length === 0 ? (
                  <p className="text-muted-foreground col-span-full text-center py-4">No available rooms</p>
                ) : (
                  availableRooms.map(room => (
                    <div
                      key={room.id}
                      onClick={() => setSelectedRoomId(room.id)}
                      className={cn(
                        "p-4 border rounded-lg cursor-pointer transition-all",
                        selectedRoomId === room.id 
                          ? "border-primary bg-primary/5 ring-2 ring-primary" 
                          : "hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold">Room {room.room_number}</p>
                          <p className="text-sm text-muted-foreground capitalize">{roomTypeLabels[room.room_type]}</p>
                          <p className="text-sm">Capacity: {room.capacity}</p>
                        </div>
                        {selectedRoomId === room.id && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <p className="mt-2 font-semibold text-primary">${room.price_per_night}/night</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Guest Selection */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Guest Details</CardTitle>
              <Button 
                variant={isNewGuest ? "default" : "outline"} 
                size="sm" 
                onClick={() => setIsNewGuest(!isNewGuest)}
                className="gap-2"
              >
                <UserPlus className="h-4 w-4" />
                {isNewGuest ? 'Select Existing' : 'New Guest'}
              </Button>
            </CardHeader>
            <CardContent>
              {isNewGuest ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name *</Label>
                    <Input
                      value={newGuest.first_name}
                      onChange={(e) => setNewGuest(prev => ({ ...prev, first_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name *</Label>
                    <Input
                      value={newGuest.last_name}
                      onChange={(e) => setNewGuest(prev => ({ ...prev, last_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newGuest.email}
                      onChange={(e) => setNewGuest(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone *</Label>
                    <Input
                      value={newGuest.phone}
                      onChange={(e) => setNewGuest(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ID Proof Type</Label>
                    <Select 
                      value={newGuest.id_proof_type} 
                      onValueChange={(v) => setNewGuest(prev => ({ ...prev, id_proof_type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="passport">Passport</SelectItem>
                        <SelectItem value="drivers_license">Driver's License</SelectItem>
                        <SelectItem value="national_id">National ID</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>ID Proof Number</Label>
                    <Input
                      value={newGuest.id_proof_number}
                      onChange={(e) => setNewGuest(prev => ({ ...prev, id_proof_number: e.target.value }))}
                    />
                  </div>
                </div>
              ) : (
                <Select value={selectedGuestId} onValueChange={setSelectedGuestId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a guest" />
                  </SelectTrigger>
                  <SelectContent>
                    {guests?.map(guest => (
                      <SelectItem key={guest.id} value={guest.id}>
                        {guest.first_name} {guest.last_name} - {guest.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {/* Additional Details */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>Adults</Label>
                  <Input
                    type="number"
                    min={1}
                    value={adults}
                    onChange={(e) => setAdults(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Children</Label>
                  <Input
                    type="number"
                    min={0}
                    value={children}
                    onChange={(e) => setChildren(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Special Requests</Label>
                <Textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Any special requests or notes..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedRoom && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-bold">Room {selectedRoom.room_number}</p>
                  <p className="text-sm text-muted-foreground capitalize">{roomTypeLabels[selectedRoom.room_type]}</p>
                </div>
              )}

              {checkInDate && checkOutDate && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Check-in:</span>
                    <span className="font-medium">{format(checkInDate, 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Check-out:</span>
                    <span className="font-medium">{format(checkOutDate, 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-medium">{nights} night(s)</span>
                  </div>
                </div>
              )}

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Room charges:</span>
                  <span>${roomPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax (18%):</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <Button 
                className="w-full" 
                size="lg"
                onClick={handleSubmit}
                disabled={createBooking.isPending || createGuest.isPending}
              >
                {(createBooking.isPending || createGuest.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Confirm Booking
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
