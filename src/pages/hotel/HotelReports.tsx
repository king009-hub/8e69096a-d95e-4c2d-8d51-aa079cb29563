import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useHotelDashboard, useHotelBookings, useHotelRooms, useHotelGuests, useHotelInvoices } from "@/hooks/useHotel";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Download, TrendingUp, Users, BedDouble, DollarSign, Calendar } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function HotelReports() {
  const [dateRange, setDateRange] = useState("30");
  const { data: dashboard } = useHotelDashboard();
  const { data: bookings = [] } = useHotelBookings();
  const { data: rooms = [] } = useHotelRooms();
  const { data: guests = [] } = useHotelGuests();
  const { data: invoices = [] } = useHotelInvoices();

  const startDate = subDays(new Date(), parseInt(dateRange));
  const endDate = new Date();

  // Filter data by date range
  const filteredBookings = bookings.filter(b => 
    new Date(b.created_at!) >= startDate
  );

  const filteredInvoices = invoices.filter(i => 
    new Date(i.created_at!) >= startDate
  );

  // Calculate revenue by day
  const revenueByDay = eachDayOfInterval({ start: startDate, end: endDate }).map(day => {
    const dayInvoices = filteredInvoices.filter(i => 
      format(new Date(i.created_at!), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
    );
    return {
      date: format(day, 'MMM dd'),
      revenue: dayInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0),
    };
  });

  // Room type distribution
  const roomTypeData = rooms.reduce((acc: any[], room) => {
    const existing = acc.find(r => r.name === room.room_type);
    if (existing) {
      existing.value++;
    } else {
      acc.push({ name: room.room_type, value: 1 });
    }
    return acc;
  }, []);

  // Booking status distribution
  const bookingStatusData = filteredBookings.reduce((acc: any[], booking) => {
    const existing = acc.find(b => b.name === booking.status);
    if (existing) {
      existing.value++;
    } else {
      acc.push({ name: booking.status, value: 1 });
    }
    return acc;
  }, []);

  // Occupancy by day
  const occupancyByDay = eachDayOfInterval({ start: startDate, end: endDate }).map(day => {
    const occupiedRooms = bookings.filter(b => {
      const checkIn = new Date(b.check_in_date);
      const checkOut = new Date(b.check_out_date);
      return isWithinInterval(day, { start: checkIn, end: checkOut }) && 
             ['checked_in', 'confirmed'].includes(b.status);
    }).length;
    return {
      date: format(day, 'MMM dd'),
      occupancy: rooms.length > 0 ? Math.round((occupiedRooms / rooms.length) * 100) : 0,
    };
  });

  const totalRevenue = filteredInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
  const avgDailyRevenue = totalRevenue / parseInt(dateRange);
  const totalBookings = filteredBookings.length;

  const generatePDF = (reportType: string) => {
    const doc = new jsPDF();
    const title = `Hotel ${reportType} Report`;
    
    doc.setFontSize(20);
    doc.text(title, 20, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'PPP')}`, 20, 30);
    doc.text(`Period: Last ${dateRange} days`, 20, 36);

    if (reportType === 'Revenue') {
      autoTable(doc, {
        startY: 45,
        head: [['Date', 'Revenue']],
        body: revenueByDay.map(d => [d.date, `$${d.revenue.toFixed(2)}`]),
      });
      doc.text(`Total Revenue: $${totalRevenue.toFixed(2)}`, 20, (doc as any).lastAutoTable.finalY + 10);
    } else if (reportType === 'Bookings') {
      autoTable(doc, {
        startY: 45,
        head: [['Reference', 'Guest', 'Check-in', 'Check-out', 'Status', 'Amount']],
        body: filteredBookings.map(b => [
          b.booking_reference,
          b.guest ? `${b.guest.first_name} ${b.guest.last_name}` : '-',
          format(new Date(b.check_in_date), 'MMM dd, yyyy'),
          format(new Date(b.check_out_date), 'MMM dd, yyyy'),
          b.status,
          `$${b.total_amount?.toFixed(2) || '0.00'}`,
        ]),
      });
    } else if (reportType === 'Occupancy') {
      autoTable(doc, {
        startY: 45,
        head: [['Date', 'Occupancy Rate']],
        body: occupancyByDay.map(d => [d.date, `${d.occupancy}%`]),
      });
    }

    doc.save(`hotel-${reportType.toLowerCase()}-report.pdf`);
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground">View hotel performance metrics</p>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${totalRevenue.toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalBookings}</p>
                  <p className="text-sm text-muted-foreground">Total Bookings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${avgDailyRevenue.toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">Avg Daily Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <Users className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{guests.length}</p>
                  <p className="text-sm text-muted-foreground">Total Guests</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="revenue">
          <TabsList>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="rooms">Room Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Revenue Trend</CardTitle>
                <Button variant="outline" size="sm" onClick={() => generatePDF('Revenue')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueByDay}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="occupancy" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Occupancy Rate</CardTitle>
                <Button variant="outline" size="sm" onClick={() => generatePDF('Occupancy')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={occupancyByDay}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Line type="monotone" dataKey="occupancy" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Booking Status Distribution</CardTitle>
                <Button variant="outline" size="sm" onClick={() => generatePDF('Bookings')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={bookingStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {bookingStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bookingStatusData.map((item, index) => (
                          <TableRow key={item.name}>
                            <TableCell className="capitalize">{item.name}</TableCell>
                            <TableCell>{item.value}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rooms" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Room Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={roomTypeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {roomTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Room Type</TableHead>
                          <TableHead>Count</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {roomTypeData.map((item) => {
                          const typeRooms = rooms.filter(r => r.room_type === item.name);
                          const available = typeRooms.filter(r => r.status === 'available').length;
                          return (
                            <TableRow key={item.name}>
                              <TableCell className="capitalize">{item.name}</TableCell>
                              <TableCell>{item.value}</TableCell>
                              <TableCell>{available} available</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
