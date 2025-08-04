import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { DashboardStats } from "@/types/inventory";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { useProfitAnalysis } from "@/hooks/useProfitAnalysis";
import { 
  Package, 
  ShoppingCart, 
  DollarSign, 
  AlertTriangle,
  TrendingUp,
  Calendar,
  Target,
  CalendarRange
} from "lucide-react";
import { format, addDays } from "date-fns";

export default function Dashboard() {
  const { formatCurrency, formatDate, stockSettings, companyProfile } = useSettingsContext();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    lowStockProducts: 0,
    todaySales: 0,
    todayRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  
  // Profit analysis state
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('daily');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date } | undefined>();
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  
  const { profitAnalysis, loading: profitLoading } = useProfitAnalysis(customDateRange);

  useEffect(() => {
    fetchDashboardData();
  }, [stockSettings.low_stock_threshold]);

  const fetchDashboardData = async () => {
    try {
      // Get total products
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Get low stock products using dynamic threshold
      const { count: lowStockCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lt('stock_quantity', stockSettings.low_stock_threshold);

      // Get total sales
      const { count: salesCount } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true });

      // Get total revenue
      const { data: revenueData } = await supabase
        .from('sales')
        .select('final_amount');

      const totalRevenue = revenueData?.reduce((sum, sale) => sum + Number(sale.final_amount), 0) || 0;

      // Get today's data
      const today = new Date().toISOString().split('T')[0];
      const { count: todaySalesCount } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .gte('sale_date', today);

      const { data: todayRevenueData } = await supabase
        .from('sales')
        .select('final_amount')
        .gte('sale_date', today);

      const todayRevenue = todayRevenueData?.reduce((sum, sale) => sum + Number(sale.final_amount), 0) || 0;

      setStats({
        totalProducts: productCount || 0,
        totalSales: salesCount || 0,
        totalRevenue,
        lowStockProducts: lowStockCount || 0,
        todaySales: todaySalesCount || 0,
        todayRevenue,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomDateChange = () => {
    if (dateFrom && dateTo) {
      setCustomDateRange({ start: dateFrom, end: dateTo });
      setSelectedPeriod('custom');
    }
  };

  const getCurrentProfitData = () => {
    if (selectedPeriod === 'custom' && profitAnalysis.custom) {
      return profitAnalysis.custom;
    }
    return profitAnalysis[selectedPeriod];
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'daily': return 'Today';
      case 'weekly': return 'This Week';
      case 'monthly': return 'This Month';
      case 'yearly': return 'This Year';
      case 'custom': return dateFrom && dateTo ? `${format(dateFrom, 'MMM dd')} - ${format(dateTo, 'MMM dd')}` : 'Custom Range';
      default: return 'Today';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(7)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-6 bg-muted rounded w-1/2 mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          {companyProfile && (
            <p className="text-muted-foreground">{companyProfile.company_name}</p>
          )}
        </div>
        <Badge variant="outline" className="text-sm">
          <Calendar className="w-4 h-4 mr-1" />
          {formatDate(new Date())}
        </Badge>
      </div>

      {/* Profit Analysis Section */}
      <Card className="col-span-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-success" />
                Profit Analysis - {getPeriodLabel()}
              </CardTitle>
              <CardDescription>
                Track your profit margins and earnings with detailed breakdown
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Today</SelectItem>
                  <SelectItem value="weekly">This Week</SelectItem>
                  <SelectItem value="monthly">This Month</SelectItem>
                  <SelectItem value="yearly">This Year</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              
              {selectedPeriod === 'custom' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CalendarRange className="h-4 w-4 mr-2" />
                      {dateFrom && dateTo ? `${format(dateFrom, 'MMM dd')} - ${format(dateTo, 'MMM dd')}` : 'Pick dates'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="end">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">From Date</label>
                        <CalendarComponent
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          className="rounded-md border"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">To Date</label>
                        <CalendarComponent
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          disabled={(date) => dateFrom ? date < dateFrom : false}
                          className="rounded-md border"
                        />
                      </div>
                      <Button onClick={handleCustomDateChange} className="w-full" disabled={!dateFrom || !dateTo}>
                        Apply Date Range
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {profitLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-success/10 rounded-lg border border-success/20">
                <div className="text-2xl font-bold text-success">
                  {formatCurrency(getCurrentProfitData().totalProfit)}
                </div>
                <p className="text-sm text-muted-foreground">Total Profit</p>
                <p className="text-xs text-success">
                  {getCurrentProfitData().profitMargin.toFixed(1)}% margin
                </p>
              </div>
              
              <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(getCurrentProfitData().productProfit)}
                </div>
                <p className="text-sm text-muted-foreground">Product Profit</p>
                <p className="text-xs text-muted-foreground">
                  From {getCurrentProfitData().salesCount} sales
                </p>
              </div>
              
              <div className="text-center p-4 bg-accent/10 rounded-lg border border-accent/20">
                <div className="text-2xl font-bold text-accent-foreground">
                  {formatCurrency(getCurrentProfitData().extraRevenue)}
                </div>
                <p className="text-sm text-muted-foreground">Extra Revenue</p>
                <p className="text-xs text-muted-foreground">
                  From agreements
                </p>
              </div>
              
              <div className="text-center p-4 bg-warning/10 rounded-lg border border-warning/20">
                <div className="text-2xl font-bold text-warning">
                  {getCurrentProfitData().profitMargin.toFixed(1)}%
                </div>
                <p className="text-sm text-muted-foreground">Profit Margin</p>
                <p className="text-xs text-muted-foreground">
                  Overall efficiency
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Products in inventory
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
            <p className="text-xs text-muted-foreground">
              All time sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              All time revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.lowStockProducts}</div>
            <p className="text-xs text-muted-foreground">
              Products below threshold
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.todaySales}</div>
            <p className="text-xs text-muted-foreground">
              Sales today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(stats.todayRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Revenue today
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Frequently used features for your inventory management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a 
              href="/products" 
              className="flex flex-col items-center p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <Package className="h-8 w-8 mb-2 text-primary" />
              <span className="text-sm font-medium">Add Product</span>
            </a>
            <a 
              href="/pos" 
              className="flex flex-col items-center p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <ShoppingCart className="h-8 w-8 mb-2 text-primary" />
              <span className="text-sm font-medium">Make Sale</span>
            </a>
            <a 
              href="/stock" 
              className="flex flex-col items-center p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <TrendingUp className="h-8 w-8 mb-2 text-primary" />
              <span className="text-sm font-medium">Stock In</span>
            </a>
            <a 
              href="/reports" 
              className="flex flex-col items-center p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <AlertTriangle className="h-8 w-8 mb-2 text-primary" />
              <span className="text-sm font-medium">View Reports</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}