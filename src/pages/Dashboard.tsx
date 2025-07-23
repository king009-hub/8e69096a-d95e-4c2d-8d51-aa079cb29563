import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { DashboardStats } from "@/types/inventory";
import { 
  Package, 
  ShoppingCart, 
  DollarSign, 
  AlertTriangle,
  TrendingUp,
  Calendar
} from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    lowStockProducts: 0,
    todaySales: 0,
    todayRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Get total products
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Get low stock products
      const { count: lowStockCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lt('stock_quantity', 10);

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

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(6)].map((_, i) => (
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
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Badge variant="outline" className="text-sm">
          <Calendar className="w-4 h-4 mr-1" />
          {format(new Date(), 'MMMM dd, yyyy')}
        </Badge>
      </div>

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
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
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
            <div className="text-2xl font-bold text-success">${stats.todayRevenue.toFixed(2)}</div>
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