import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGenerateCheckoutInvoice, useProcessPayment } from '@/hooks/useHotelServices';
import { useUpdateBookingStatus, useHotelInfo } from '@/hooks/useHotel';
import { HotelBooking, HotelPaymentMethod } from '@/types/hotel';
import { printHotelInvoice, downloadHotelInvoice } from '@/utils/hotelInvoicePdf';
import { Loader2, Receipt, CreditCard, Banknote, Building, DollarSign, Printer, Download } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: HotelBooking;
}

const paymentMethods = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'upi', label: 'UPI', icon: DollarSign },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building },
];

export function CheckoutDialog({ open, onOpenChange, booking }: CheckoutDialogProps) {
  const [invoice, setInvoice] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<HotelPaymentMethod>('cash');
  const [isProcessing, setIsProcessing] = useState(false);

  const generateInvoice = useGenerateCheckoutInvoice();
  const processPayment = useProcessPayment();
  const updateBookingStatus = useUpdateBookingStatus();
  const { data: hotelInfo } = useHotelInfo();

  const nights = differenceInDays(new Date(booking.check_out_date), new Date(booking.check_in_date));

  const handlePrint = () => {
    if (invoice) {
      printHotelInvoice(invoice, booking, hotelInfo || undefined);
    }
  };

  const handleDownload = () => {
    if (invoice) {
      downloadHotelInvoice(invoice, booking, hotelInfo || undefined);
    }
  };

  useEffect(() => {
    if (open && booking.id) {
      generateInvoice.mutateAsync(booking.id).then(setInvoice);
    }
  }, [open, booking.id]);

  const handleCheckout = async () => {
    if (!invoice) {
      toast.error('Invoice not ready');
      return;
    }

    setIsProcessing(true);
    try {
      // Process payment
      await processPayment.mutateAsync({
        invoiceId: invoice.id,
        paymentMethod,
        amountPaid: Number(invoice.total_amount),
      });

      // Update booking status
      await updateBookingStatus.mutateAsync({
        id: booking.id,
        status: 'checked_out',
        roomStatus: 'cleaning',
      });

      toast.success('Checkout completed successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const SelectedPaymentIcon = paymentMethods.find(p => p.value === paymentMethod)?.icon || Banknote;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Checkout - Room {booking.room?.room_number}
          </DialogTitle>
        </DialogHeader>

        {generateInvoice.isPending || !invoice ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* Guest Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-lg">
                      {booking.guest?.first_name} {booking.guest?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{booking.booking_reference}</p>
                  </div>
                  <Badge>{nights} Night(s)</Badge>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {format(new Date(booking.check_in_date), 'MMM dd, yyyy')} → {format(new Date(booking.check_out_date), 'MMM dd, yyyy')}
                </div>
              </CardContent>
            </Card>

            {/* Invoice Items */}
            <div className="space-y-2">
              <p className="font-medium">Invoice Details</p>
              <ScrollArea className="h-48 border rounded-lg">
                <div className="p-3 space-y-2">
                  {invoice.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity}x ${Number(item.unit_price).toFixed(2)}
                        </p>
                      </div>
                      <span className="font-medium">${Number(item.total_price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Totals */}
            <div className="space-y-2 bg-muted p-4 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>${Number(invoice.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax (18%):</span>
                <span>${Number(invoice.tax_amount).toFixed(2)}</span>
              </div>
              {Number(invoice.discount_amount) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount:</span>
                  <span>-${Number(invoice.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span className="text-primary">${Number(invoice.total_amount).toFixed(2)}</span>
              </div>
              {Number(booking.paid_amount) > 0 && (
                <>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Already Paid:</span>
                    <span>-${Number(booking.paid_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Balance Due:</span>
                    <span>${(Number(invoice.total_amount) - Number(booking.paid_amount)).toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <p className="font-medium">Payment Method</p>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as HotelPaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(method => (
                    <SelectItem key={method.value} value={method.value}>
                      <div className="flex items-center gap-2">
                        <method.icon className="h-4 w-4" />
                        {method.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="outline" disabled={!invoice} onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" disabled={!invoice} onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button
            onClick={handleCheckout} 
            disabled={isProcessing || !invoice}
            className="gap-2"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SelectedPaymentIcon className="h-4 w-4" />
            )}
            Complete Checkout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
