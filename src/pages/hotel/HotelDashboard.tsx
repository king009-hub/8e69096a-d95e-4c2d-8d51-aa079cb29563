import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useHotelDashboard, useHotelBookings, useHotelRooms } from '@/hooks/useHotel';
import { 
  Building2, Users, CalendarCheck, CalendarX, DollarSign, 
  TrendingUp, Plus, ArrowRight, Loader2, BedDouble
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { RoomAvailabilityCalendar } from '@/components/hotel/RoomAvailabilityCalendar';
import { Layout } from '@/components/layout/Layout';
import { useSettingsContext } from '@/contexts/SettingsContext';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  checked_in: 'bg-green-100 text-green-800',
  checked_out: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

const ROOM_STATUS_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function HotelDashboard() {
  const navigate = useNavigate();
  const { data: dashboard, isLoading } = useHotelDashboard();
  const { data: bookings = [] } = useHotelBookings();
  const { data: rooms = [] } = useHotelRooms();
  const { formatCurrency } = useSettingsContext();

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const roomStatusData = dashboard ? [
    { name: 'Available', value: dashboard.roomsByStatus.available, color: ROOM_STATUS_COLORS[0] },
    { name: 'Occupied', value: dashboard.roomsByStatus.occupied, color: ROOM_STATUS_COLORS[1] },
    { name: 'Reserved', value: dashboard.roomsByStatus.reserved, color: ROOM_STATUS_COLORS[2] },
    { name: 'Maintenance', value: dashboard.roomsByStatus.maintenance, color: ROOM_STATUS_COLORS[3] },
    { name: 'Cleaning', value: dashboard.roomsByStatus.cleaning, color: ROOM_STATUS_COLORS[4] },
  ].filter(item => item.value > 0) : [];

  const todayBookings = bookings?.filter(b => {
    const today = new Date().toISOString().split('T')[0];
    return b.check_in_date === today || b.check_out_date === today;
  }) || [];

  return (
    <Layout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Hotel Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's your hotel overview.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/hotel/bookings/new')} className="gap-2">
              <Plus className="h-4 w-4" />
              New Booking
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 opacity-80" />
                <div>
                  <p className="text-sm opacity-80">Total Rooms</p>
                  <p className="text-2xl font-bold">{dashboard?.totalRooms || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 opacity-80" />
                <div>
                  <p className="text-sm opacity-80">Occupancy</p>
                  <p className="text-2xl font-bold">{dashboard?.occupancyRate || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CalendarCheck className="h-8 w-8 opacity-80" />
                <div>
                  <p className="text-sm opacity-80">Check-ins</p>
                  <p className="text-2xl font-bold">{dashboard?.todayCheckIns || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CalendarX className="h-8 w-8 opacity-80" />
                <div>
                  <p className="text-sm opacity-80">Check-outs</p>
                  <p className="text-2xl font-bold">{dashboard?.todayCheckOuts || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 opacity-80" />
                <div>
                  <p className="text-sm opacity-80">Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(dashboard?.totalRevenue || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 opacity-80" />
                <div>
                  <p className="text-sm opacity-80">Guests</p>
                  <p className="text-2xl font-bold">{dashboard?.totalGuests || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Room Availability Calendar */}
        <RoomAvailabilityCalendar bookings={bookings} rooms={rooms} />

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Revenue (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard?.revenueByDay || []}>
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'EEE')}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                      labelFormatter={(label) => format(new Date(label), 'MMM dd, yyyy')}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Room Status Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BedDouble className="h-5 w-5" />
                Room Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roomStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {roomStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Bookings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Bookings</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/hotel/bookings')} className="gap-1">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard?.recentBookings?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No bookings yet</p>
                ) : (
                  dashboard?.recentBookings?.map((booking: any) => (
                    <div key={booking.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{booking.booking_reference}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(booking.check_in_date), 'MMM dd')} - {format(new Date(booking.check_out_date), 'MMM dd')}
                        </p>
                      </div>
                      <Badge className={statusColors[booking.status as keyof typeof statusColors]}>
                        {booking.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Today's Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Today's Activity</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/hotel/check-in-out')} className="gap-1">
                Manage <ArrowRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todayBookings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No check-ins or check-outs today</p>
                ) : (
                  todayBookings.slice(0, 5).map((booking) => {
                    const isCheckIn = booking.check_in_date === new Date().toISOString().split('T')[0];
                    return (
                      <div key={booking.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {isCheckIn ? (
                            <CalendarCheck className="h-5 w-5 text-green-500" />
                          ) : (
                            <CalendarX className="h-5 w-5 text-amber-500" />
                          )}
                          <div>
                            <p className="font-medium">
                              {booking.guest?.first_name} {booking.guest?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Room {booking.room?.room_number || 'TBA'}
                            </p>
                          </div>
                        </div>
                        <Badge variant={isCheckIn ? "default" : "secondary"}>
                          {isCheckIn ? 'Check In' : 'Check Out'}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
