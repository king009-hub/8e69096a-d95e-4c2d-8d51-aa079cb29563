import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Eye, Calendar, DollarSign } from "lucide-react";
import { useSales } from "@/hooks/useSales";
import { Sale } from "@/types/inventory";
import { format } from "date-fns";

export default function SalesHistory() {
  const { sales, loading } = useSales();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);

  useEffect(() => {
    const filtered = sales.filter((sale) =>
      sale.sale_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.customer_name && sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      sale.payment_method.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSales(filtered);
  }, [sales, searchTerm]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return 'bg-green-100 text-green-800';
      case 'card':
        return 'bg-blue-100 text-blue-800';
      case 'digital':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-foreground">Sales History</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sales.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(sales.reduce((sum, sale) => sum + sale.final_amount, 0))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Sale</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sales.length > 0 
                  ? formatCurrency(sales.reduce((sum, sale) => sum + sale.final_amount, 0) / sales.length)
                  : formatCurrency(0)
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by sale number, customer, or payment method..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-4">
                <div className="text-muted-foreground">Loading sales...</div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sale Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.sale_number}</TableCell>
                      <TableCell>
                        {format(new Date(sale.sale_date), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {sale.customer_name || 'Walk-in Customer'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(sale.final_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getPaymentMethodColor(sale.payment_method)}>
                          {sale.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {/* View details functionality */}}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {!loading && filteredSales.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                {searchTerm ? 'No sales found matching your search.' : 'No sales recorded yet.'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}