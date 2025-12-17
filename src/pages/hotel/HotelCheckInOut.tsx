import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHotelBookings, useUpdateBookingStatus } from '@/hooks/useHotel';
import { CalendarCheck, CalendarX, Loader2, User, BedDouble, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function HotelCheckInOut() {
  const { data: bookings, isLoading } = useHotelBookings();
  const updateStatus = useUpdateBookingStatus();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const arrivals = bookings?.filter(b => 
    b.check_in_date === today && 
    (b.status === 'confirmed' || b.status === 'pending')
  ) || [];

  const departures = bookings?.filter(b => 
    b.check_out_date === today && 
    b.status === 'checked_in'
  ) || [];

  const currentGuests = bookings?.filter(b => b.status === 'checked_in') || [];

  const handleCheckIn = async (bookingId: string) => {
    setProcessingId(bookingId);
    try {
      await updateStatus.mutateAsync({ 
        id: bookingId, 
        status: 'checked_in',
        roomStatus: 'occupied'
      });
      toast.success('Guest checked in successfully');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCheckOut = async (bookingId: string) => {
    setProcessingId(bookingId);
    try {
      await updateStatus.mutateAsync({ 
        id: bookingId, 
        status: 'checked_out',
        roomStatus: 'cleaning'
      });
      toast.success('Guest checked out successfully');
    } finally {
      setProcessingId(null);
    }
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
      <div>
        <h1 className="text-3xl font-bold">Check-in / Check-out</h1>
        <p className="text-muted-foreground">Manage today's arrivals and departures</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CalendarCheck className="h-8 w-8 opacity-80" />
              <div>
                <p className="text-sm opacity-80">Today's Arrivals</p>
                <p className="text-2xl font-bold">{arrivals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CalendarX className="h-8 w-8 opacity-80" />
              <div>
                <p className="text-sm opacity-80">Today's Departures</p>
                <p className="text-2xl font-bold">{departures.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <User className="h-8 w-8 opacity-80" />
              <div>
                <p className="text-sm opacity-80">Current Guests</p>
                <p className="text-2xl font-bold">{currentGuests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="arrivals" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="arrivals" className="gap-2">
            <CalendarCheck className="h-4 w-4" />
            Arrivals ({arrivals.length})
          </TabsTrigger>
          <TabsTrigger value="departures" className="gap-2">
            <CalendarX className="h-4 w-4" />
            Departures ({departures.length})
          </TabsTrigger>
          <TabsTrigger value="in-house" className="gap-2">
            <User className="h-4 w-4" />
            In-House ({currentGuests.length})
          </TabsTrigger>
        </TabsList>

        {/* Arrivals */}
        <TabsContent value="arrivals">
          <div className="grid gap-4">
            {arrivals.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CalendarCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No arrivals scheduled for today</p>
                </CardContent>
              </Card>
            ) : (
              arrivals.map(booking => (
                <Card key={booking.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">
                            {booking.guest?.first_name} {booking.guest?.last_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {booking.booking_reference} • {booking.guest?.phone}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <div className="flex items-center gap-1">
                              <BedDouble className="h-4 w-4" />
                              Room {booking.room?.room_number || 'TBA'}
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              ${booking.total_amount}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">
                          {booking.status === 'pending' ? 'Pending Confirmation' : 'Confirmed'}
                        </Badge>
                        <Button
                          onClick={() => handleCheckIn(booking.id)}
                          disabled={processingId === booking.id}
                          className="gap-2"
                        >
                          {processingId === booking.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CalendarCheck className="h-4 w-4" />
                          )}
                          Check In
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Departures */}
        <TabsContent value="departures">
          <div className="grid gap-4">
            {departures.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CalendarX className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No departures scheduled for today</p>
                </CardContent>
              </Card>
            ) : (
              departures.map(booking => (
                <Card key={booking.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                          <User className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">
                            {booking.guest?.first_name} {booking.guest?.last_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {booking.booking_reference} • Room {booking.room?.room_number}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span>Check-in: {format(new Date(booking.check_in_date), 'MMM dd')}</span>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              Balance: ${(booking.total_amount - booking.paid_amount).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-green-100 text-green-800">Checked In</Badge>
                        <Button
                          variant="outline"
                          onClick={() => handleCheckOut(booking.id)}
                          disabled={processingId === booking.id}
                          className="gap-2"
                        >
                          {processingId === booking.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CalendarX className="h-4 w-4" />
                          )}
                          Check Out
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* In-House Guests */}
        <TabsContent value="in-house">
          <div className="grid gap-4">
            {currentGuests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No guests currently in-house</p>
                </CardContent>
              </Card>
            ) : (
              currentGuests.map(booking => (
                <Card key={booking.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">
                            {booking.guest?.first_name} {booking.guest?.last_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {booking.booking_reference} • {booking.guest?.phone}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <div className="flex items-center gap-1">
                              <BedDouble className="h-4 w-4" />
                              Room {booking.room?.room_number}
                            </div>
                            <span>
                              {format(new Date(booking.check_in_date), 'MMM dd')} - {format(new Date(booking.check_out_date), 'MMM dd')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">In-House</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
