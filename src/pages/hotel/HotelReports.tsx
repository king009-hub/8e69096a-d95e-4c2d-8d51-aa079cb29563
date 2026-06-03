import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useHotelDashboard, useHotelBookings, useHotelRooms, useHotelGuests, useHotelInvoices } from "@/hooks/useHotel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import {
  Download, TrendingUp, Users, BedDouble, DollarSign, Calendar,
  Clock, UtensilsCrossed, Wine, ShoppingCart, CheckCircle2, AlertTriangle, Package
} from "lucide-react";
import { format, subDays, eachDayOfInterval, isWithinInterval } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

function useShiftReports() {
  return useQuery({
    queryKey: ['hotel-shift-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_staff_shifts')
        .select('*, staff:hotel_staff(first_name, last_name, role)')
        .eq('status', 'closed')
        .order('closed_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });
}

export default function HotelReports() {
  const [dateRange, setDateRange] = useState("30");
  const { formatCurrency } = useSettingsContext();
  const { data: dashboard } = useHotelDashboard();
  const { data: bookings = [] } = useHotelBookings();
  const { data: rooms = [] } = useHotelRooms();
  const { data: guests = [] } = useHotelGuests();
  const { data: invoices = [] } = useHotelInvoices();
  const { data: shifts = [] } = useShiftReports();
  const [selectedShift, setSelectedShift] = useState<any>(null);

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
    doc.setFontSize(20);
    doc.text(`Hotel ${reportType} Report`, 20, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'PPP')}`, 20, 30);
    doc.text(`Period: Last ${dateRange} days`, 20, 36);

    if (reportType === 'Revenue') {
      autoTable(doc, {
        startY: 45,
        head: [['Date', 'Revenue']],
        body: revenueByDay.map(d => [d.date, formatCurrency(d.revenue)]),
      });
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
          formatCurrency(b.total_amount || 0),
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

  const filteredShifts = shifts.filter(s =>
    s.closed_at && new Date(s.closed_at) >= startDate
  );

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
                <div className="p-3 bg-primary/10 rounded-lg">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-primary" />
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
                <div className="p-3 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(avgDailyRevenue)}</p>
                  <p className="text-sm text-muted-foreground">Avg Daily Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{filteredShifts.length}</p>
                  <p className="text-sm text-muted-foreground">Shifts Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="shifts">
          <TabsList>
            <TabsTrigger value="shifts">Shift Reports</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="rooms">Room Analysis</TabsTrigger>
          </TabsList>

          {/* Shift Reports Tab */}
          <TabsContent value="shifts" className="space-y-4">
            {selectedShift ? (
              <ShiftDetail shift={selectedShift} formatCurrency={formatCurrency} onBack={() => setSelectedShift(null)} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Completed Shifts</CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredShifts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No completed shifts in this period</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Staff</TableHead>
                          <TableHead>Shift</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Orders</TableHead>
                          <TableHead>Sales</TableHead>
                          <TableHead>Cash Diff</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredShifts.map((shift: any) => {
                          const summary = shift.summary || {};
                          const diff = shift.difference || 0;
                          return (
                            <TableRow key={shift.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedShift(shift)}>
                              <TableCell className="font-medium">
                                {shift.staff?.first_name} {shift.staff?.last_name}
                                <span className="text-xs text-muted-foreground ml-1 capitalize">({shift.staff_role})</span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">{shift.shift_label}</Badge>
                              </TableCell>
                              <TableCell>{shift.shift_duration || '-'}</TableCell>
                              <TableCell>{shift.total_orders || 0}</TableCell>
                              <TableCell>{formatCurrency(shift.total_sales || 0)}</TableCell>
                              <TableCell>
                                <span className={diff < 0 ? 'text-destructive font-medium' : diff > 0 ? 'text-green-600 font-medium' : ''}>
                                  {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                                  {diff < 0 && <AlertTriangle className="h-3 w-3 inline ml-1" />}
                                </span>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs">
                                {shift.closed_at ? format(new Date(shift.closed_at), 'MMM dd, p') : '-'}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm">View</Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="revenue" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Revenue Trend</CardTitle>
                <Button variant="outline" size="sm" onClick={() => generatePDF('Revenue')}>
                  <Download className="h-4 w-4 mr-2" /> Export PDF
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueByDay}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
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
                  <Download className="h-4 w-4 mr-2" /> Export PDF
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={occupancyByDay}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
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
                  <Download className="h-4 w-4 mr-2" /> Export PDF
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={bookingStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {bookingStatusData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookingStatusData.map((item) => (
                        <TableRow key={item.name}>
                          <TableCell className="capitalize">{item.name}</TableCell>
                          <TableCell>{item.value}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                        <Pie data={roomTypeData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {roomTypeData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
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
                        const available = rooms.filter(r => r.room_type === item.name && r.status === 'available').length;
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

// Shift detail component
function ShiftDetail({ shift, formatCurrency, onBack }: { shift: any; formatCurrency: (n: number) => string; onBack: () => void }) {
  const summary = shift.summary || {};
  const kitchenSales = shift.kitchen_sales || summary.kitchen_sales || {};
  const barSales = shift.bar_sales || summary.bar_sales || {};
  const stockConsumed = summary.stock_consumed || {};
  const diff = shift.difference || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Shift Report — {shift.staff?.first_name} {shift.staff?.last_name}
          </h2>
          <p className="text-sm text-muted-foreground">
            <Badge variant="outline" className="capitalize mr-2">{shift.shift_label}</Badge>
            {shift.opened_at && format(new Date(shift.opened_at), 'PPp')} → {shift.closed_at && format(new Date(shift.closed_at), 'p')}
            <span className="ml-2">({shift.shift_duration})</span>
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>← Back</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <ShoppingCart className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Orders</p>
            <p className="text-xl font-bold">{shift.total_orders || 0}</p>
            <p className="text-xs text-muted-foreground">{shift.completed_orders || 0} completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Total Sales</p>
            <p className="text-xl font-bold">{formatCurrency(shift.total_sales || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Billed</p>
            <p className="text-xl font-bold">{formatCurrency(shift.billed_sales || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Items Sold</p>
            <p className="text-xl font-bold">{shift.total_items || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Cash Reconciliation */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Cash Reconciliation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Opening Cash:</span>
            <span>{formatCurrency(shift.opening_cash || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span>Billed Sales:</span>
            <span>{formatCurrency(shift.billed_sales || 0)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-medium">
            <span>Expected Cash:</span>
            <span>{formatCurrency(shift.expected_cash || 0)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Closing Cash:</span>
            <span>{formatCurrency(shift.closing_cash || 0)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>Difference:</span>
            <span className={diff < 0 ? 'text-destructive' : diff > 0 ? 'text-green-600' : ''}>
              {diff > 0 ? '+' : ''}{formatCurrency(diff)}
              {diff < 0 && <AlertTriangle className="h-3 w-3 inline ml-1" />}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Room Activity */}
      {(shift.shift_check_ins > 0 || shift.shift_check_outs > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1"><BedDouble className="h-4 w-4" /> Room Activity</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="text-center p-2 rounded bg-muted">
              <p className="font-bold">{shift.shift_check_ins || 0}</p>
              <p className="text-xs text-muted-foreground">Check-ins</p>
            </div>
            <div className="text-center p-2 rounded bg-muted">
              <p className="font-bold">{shift.shift_check_outs || 0}</p>
              <p className="text-xs text-muted-foreground">Check-outs</p>
            </div>
            <div className="text-center p-2 rounded bg-muted">
              <p className="font-bold">{shift.occupied_rooms || 0}</p>
              <p className="text-xs text-muted-foreground">Occupied</p>
            </div>
            <div className="text-center p-2 rounded bg-muted">
              <p className="font-bold">{shift.available_rooms || 0}</p>
              <p className="text-xs text-muted-foreground">Available</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Kitchen Items */}
        {Object.keys(kitchenSales).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1"><UtensilsCrossed className="h-4 w-4" /> Kitchen Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                {Object.entries(kitchenSales).map(([name, qty]) => (
                  <div key={name} className="flex justify-between">
                    <span>{name}</span>
                    <Badge variant="outline">×{qty as number}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bar Items */}
        {Object.keys(barSales).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1"><Wine className="h-4 w-4" /> Bar Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                {Object.entries(barSales).map(([name, qty]) => (
                  <div key={name} className="flex justify-between">
                    <span>{name}</span>
                    <Badge variant="outline">×{qty as number}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stock Consumed */}
        {Object.keys(stockConsumed).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1"><Package className="h-4 w-4" /> Stock Consumed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                {Object.entries(stockConsumed).map(([name, qty]) => (
                  <div key={name} className="flex justify-between">
                    <span>{name}</span>
                    <Badge variant="outline">×{qty as number}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Notes */}
      {(shift.opening_notes || shift.closing_notes) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {shift.opening_notes && (
              <div>
                <span className="font-medium">Opening: </span>
                <span className="text-muted-foreground">{shift.opening_notes}</span>
              </div>
            )}
            {shift.closing_notes && (
              <div>
                <span className="font-medium">Closing: </span>
                <span className="text-muted-foreground">{shift.closing_notes}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
