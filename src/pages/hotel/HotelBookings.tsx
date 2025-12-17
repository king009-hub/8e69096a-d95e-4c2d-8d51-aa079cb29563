import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useHotelBookings, useUpdateBookingStatus } from '@/hooks/useHotel';
import { BookingStatus } from '@/types/hotel';
import { Plus, Search, Eye, Edit, Loader2, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const statusColors: Record<BookingStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  checked_in: 'bg-green-100 text-green-800',
  checked_out: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function HotelBookings() {
  const navigate = useNavigate();
  const { data: bookings, isLoading } = useHotelBookings();
  const updateStatus = useUpdateBookingStatus();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredBookings = bookings?.filter(booking => {
    const matchesSearch = 
      booking.booking_reference.toLowerCase().includes(search.toLowerCase()) ||
      (booking.guest?.first_name + ' ' + booking.guest?.last_name).toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const handleStatusChange = (bookingId: string, newStatus: BookingStatus) => {
    let roomStatus = undefined;
    if (newStatus === 'checked_in') roomStatus = 'occupied' as const;
    if (newStatus === 'checked_out') roomStatus = 'cleaning' as const;
    if (newStatus === 'cancelled') roomStatus = 'available' as const;
    
    updateStatus.mutate({ id: bookingId, status: newStatus, roomStatus });
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
          <h1 className="text-3xl font-bold">Bookings</h1>
          <p className="text-muted-foreground">Manage reservations and bookings</p>
        </div>
        <Button onClick={() => navigate('/hotel/bookings/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          New Booking
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by reference or guest name..."
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="checked_in">Checked In</SelectItem>
                <SelectItem value="checked_out">Checked Out</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No bookings found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map(booking => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">{booking.booking_reference}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {booking.guest?.first_name} {booking.guest?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">{booking.guest?.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {booking.room ? (
                        <div>
                          <p className="font-medium">Room {booking.room.room_number}</p>
                          <p className="text-sm text-muted-foreground capitalize">{booking.room.room_type}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(booking.check_in_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{format(new Date(booking.check_out_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">${booking.total_amount}</p>
                        <p className="text-sm text-muted-foreground">Paid: ${booking.paid_amount}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={booking.status}
                        onValueChange={(status) => handleStatusChange(booking.id, status as BookingStatus)}
                        disabled={booking.status === 'cancelled' || booking.status === 'checked_out'}
                      >
                        <SelectTrigger className="w-[130px]">
                          <Badge className={statusColors[booking.status]}>
                            {booking.status.replace('_', ' ')}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="checked_in">Checked In</SelectItem>
                          <SelectItem value="checked_out">Checked Out</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => navigate(`/hotel/bookings/${booking.id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
