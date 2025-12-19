import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useHotelInvoices, useHotelInfo } from '@/hooks/useHotel';
import { HotelInvoice } from '@/types/hotel';
import { PaymentDialog } from '@/components/hotel/PaymentDialog';
import { printHotelInvoice } from '@/utils/hotelInvoicePdf';
import { fetchInvoiceWithItems } from '@/hooks/useHotelServices';
import { Search, FileText, Loader2, Printer, DollarSign, CreditCard, Banknote, Building } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const paymentMethodIcons = {
  cash: Banknote,
  card: CreditCard,
  upi: DollarSign,
  bank_transfer: Building,
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function HotelBilling() {
  const { data: invoices, isLoading } = useHotelInvoices();
  const { data: hotelInfo } = useHotelInfo();
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<HotelInvoice | null>(null);

  const handlePrintInvoice = async (invoice: HotelInvoice) => {
    try {
      const invoiceWithItems = await fetchInvoiceWithItems(invoice.id);
      printHotelInvoice(invoiceWithItems as any, invoiceWithItems.booking as any || undefined, hotelInfo || undefined);
    } catch (error) {
      toast.error('Failed to load invoice details');
    }
  };

  const filteredInvoices = invoices?.filter(invoice => {
    const searchLower = search.toLowerCase();
    return (
      invoice.invoice_number.toLowerCase().includes(searchLower) ||
      (invoice.guest?.first_name + ' ' + invoice.guest?.last_name).toLowerCase().includes(searchLower)
    );
  }) || [];

  const totalRevenue = invoices?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
  const pendingAmount = invoices?.filter(inv => inv.payment_status === 'pending')
    .reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
  const paidAmount = invoices?.filter(inv => inv.payment_status === 'paid')
    .reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Payments</h1>
        <p className="text-muted-foreground">Manage invoices and process payments</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold">${paidAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Banknote className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">${pendingAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by invoice number or guest name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No invoices found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map(invoice => {
                  const PaymentIcon = invoice.payment_method 
                    ? paymentMethodIcons[invoice.payment_method] 
                    : DollarSign;
                  
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <p className="font-medium">{invoice.invoice_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(invoice.created_at), 'MMM dd, yyyy')}
                        </p>
                      </TableCell>
                      <TableCell>
                        {invoice.guest ? `${invoice.guest.first_name} ${invoice.guest.last_name}` : '-'}
                      </TableCell>
                      <TableCell className="font-bold">${Number(invoice.total_amount).toFixed(2)}</TableCell>
                      <TableCell>
                        {invoice.payment_method ? (
                          <div className="flex items-center gap-1">
                            <PaymentIcon className="h-4 w-4" />
                            <span className="capitalize">{invoice.payment_method.replace('_', ' ')}</span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[invoice.payment_status || 'pending']}>
                          {invoice.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedInvoice(invoice)}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Pay
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => handlePrintInvoice(invoice)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedInvoice && (
        <PaymentDialog
          open={!!selectedInvoice}
          onOpenChange={(open) => !open && setSelectedInvoice(null)}
          invoice={selectedInvoice}
        />
      )}
    </div>
  );
}
