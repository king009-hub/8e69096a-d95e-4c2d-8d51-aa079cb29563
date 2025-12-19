import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProcessPayment } from '@/hooks/useHotelServices';
import { HotelInvoice, HotelPaymentMethod } from '@/types/hotel';
import { Loader2, CreditCard, Banknote, Building, DollarSign, CheckCircle } from 'lucide-react';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: HotelInvoice;
}

const paymentMethods = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'upi', label: 'UPI', icon: DollarSign },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building },
];

export function PaymentDialog({ open, onOpenChange, invoice }: PaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<HotelPaymentMethod>(invoice.payment_method || 'cash');
  const [amountPaid, setAmountPaid] = useState(Number(invoice.total_amount));

  const processPayment = useProcessPayment();

  const handlePayment = async () => {
    await processPayment.mutateAsync({
      invoiceId: invoice.id,
      paymentMethod,
      amountPaid,
    });
    onOpenChange(false);
  };

  const isPaid = invoice.payment_status === 'paid';
  const SelectedPaymentIcon = paymentMethods.find(p => p.value === paymentMethod)?.icon || Banknote;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Process Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Invoice Info */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice:</span>
              <span className="font-medium">{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Guest:</span>
              <span className="font-medium">
                {invoice.guest?.first_name} {invoice.guest?.last_name}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>${Number(invoice.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax:</span>
              <span>${Number(invoice.tax_amount).toFixed(2)}</span>
            </div>
            {Number(invoice.discount_amount) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span>-${Number(invoice.discount_amount).toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-primary">${Number(invoice.total_amount).toFixed(2)}</span>
            </div>
          </div>

          {isPaid ? (
            <div className="flex items-center justify-center gap-2 p-4 bg-green-50 rounded-lg text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Payment Complete</span>
            </div>
          ) : (
            <>
              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Payment Method</Label>
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

              {/* Amount */}
              <div className="space-y-2">
                <Label>Amount Received</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                />
                {amountPaid < Number(invoice.total_amount) && (
                  <p className="text-sm text-amber-600">
                    Partial payment: ${(Number(invoice.total_amount) - amountPaid).toFixed(2)} remaining
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isPaid ? 'Close' : 'Cancel'}
          </Button>
          {!isPaid && (
            <Button 
              onClick={handlePayment} 
              disabled={processPayment.isPending || amountPaid <= 0}
              className="gap-2"
            >
              {processPayment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SelectedPaymentIcon className="h-4 w-4" />
              )}
              Process ${amountPaid.toFixed(2)}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
