import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, Calendar } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useSales } from "@/hooks/useSales";
import { Product, Sale } from "@/types/inventory";
import { format, subDays, isAfter } from "date-fns";

export default function Reports() {
  const { products } = useProducts();
  const { sales } = useSales();
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);

  useEffect(() => {
    // Filter low stock products
    const lowStock = products.filter(
      (product) => product.stock_quantity <= product.min_stock_threshold
    );
    setLowStockProducts(lowStock);

    // Filter recent sales (last 7 days)
    const sevenDaysAgo = subDays(new Date(), 7);
    const recent = sales.filter((sale) => 
      isAfter(new Date(sale.sale_date), sevenDaysAgo)
    );
    setRecentSales(recent);
  }, [products, sales]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.final_amount, 0);
  const totalProductValue = products.reduce((sum, product) => 
    sum + (product.stock_quantity * product.purchase_price), 0
  );
  const recentRevenue = recentSales.reduce((sum, sale) => sum + sale.final_amount, 0);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
              <p className="text-xs text-muted-foreground">
                Active inventory items
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sales.length}</div>
              <p className="text-xs text-muted-foreground">
                All time transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                All time earnings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{lowStockProducts.length}</div>
              <p className="text-xs text-muted-foreground">
                Need restocking
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Reports */}
        <Tabs defaultValue="inventory" className="space-y-4">
          <TabsList>
            <TabsTrigger value="inventory">Inventory Report</TabsTrigger>
            <TabsTrigger value="sales">Sales Report</TabsTrigger>
            <TabsTrigger value="alerts">Stock Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="text-lg font-semibold">
                    Total Inventory Value: {formatCurrency(totalProductValue)}
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Stock Quantity</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.category || 'Uncategorized'}</TableCell>
                        <TableCell>{product.stock_quantity}</TableCell>
                        <TableCell>
                          {formatCurrency(product.stock_quantity * product.purchase_price)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              product.stock_quantity <= product.min_stock_threshold
                                ? "destructive"
                                : product.stock_quantity <= product.min_stock_threshold * 2
                                ? "secondary"
                                : "default"
                            }
                          >
                            {product.stock_quantity <= product.min_stock_threshold
                              ? "Low Stock"
                              : product.stock_quantity <= product.min_stock_threshold * 2
                              ? "Medium Stock"
                              : "Good Stock"
                            }
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales">
            <Card>
              <CardHeader>
                <CardTitle>Sales Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-lg font-semibold">
                      Last 7 Days: {formatCurrency(recentRevenue)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {recentSales.length} transactions
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">
                      Average Sale: {sales.length > 0 ? formatCurrency(totalRevenue / sales.length) : formatCurrency(0)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Per transaction
                    </div>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sale Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSales.slice(0, 10).map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">{sale.sale_number}</TableCell>
                        <TableCell>
                          {format(new Date(sale.sale_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>{sale.customer_name || 'Walk-in'}</TableCell>
                        <TableCell>{formatCurrency(sale.final_amount)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{sale.payment_method}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle>Stock Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                {lowStockProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <div className="text-lg font-medium">All products are well stocked!</div>
                    <div className="text-sm text-muted-foreground">No low stock alerts at this time.</div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Minimum Threshold</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action Needed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.stock_quantity}</TableCell>
                          <TableCell>{product.min_stock_threshold}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Low Stock
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              Reorder Now
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}