import { useState } from 'react';
import { useStaffSession } from '@/contexts/StaffSessionContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  StopCircle, DollarSign, Loader2, CheckCircle2,
  ShoppingCart, UtensilsCrossed, Wine, BedDouble,
  Clock, TrendingUp, AlertTriangle, Printer
} from 'lucide-react';
import { toast } from 'sonner';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { format } from 'date-fns';

interface ShiftCloseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShiftCloseDialog({ open, onOpenChange }: ShiftCloseDialogProps) {
  const { activeStaff, activeShift, closeShift } = useStaffSession();
  const { formatCurrency } = useSettingsContext();
  const [closingCash, setClosingCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);

  const handleCloseShift = async () => {
    if (!closingCash && closingCash !== '0') {
      toast.error('Please enter closing cash amount');
      return;
    }
    setIsLoading(true);
    const result = await closeShift({
      closing_cash: parseFloat(closingCash) || 0,
      closing_notes: closingNotes || undefined,
    });
    setIsLoading(false);

    if (result.success) {
      setReport(result.report);
      setShowReport(true);
      toast.success('Shift closed successfully!');
    } else {
      toast.error(result.error || 'Failed to close shift');
    }
  };

  const handleDone = () => {
    setReport(null);
    setShowReport(false);
    setClosingCash('');
    setClosingNotes('');
    onOpenChange(false);
  };

  const handlePrintReport = () => {
    window.print();
  };

  if (showReport && report) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Shift Report
            </DialogTitle>
            <DialogDescription>
              Shift closed at {format(new Date(), 'PPpp')}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="font-bold">{report.shift_duration}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <ShoppingCart className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Orders</p>
                    <p className="font-bold">{report.total_orders}</p>
                    <p className="text-xs text-muted-foreground">{report.completed_orders} completed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Total Sales</p>
                    <p className="font-bold">{formatCurrency(report.total_sales)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <DollarSign className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Billed</p>
                    <p className="font-bold">{formatCurrency(report.billed_sales)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Cash Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Cash Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Opening Cash:</span>
                    <span>{formatCurrency(report.opening_cash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Billed Sales:</span>
                    <span>{formatCurrency(report.billed_sales)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Expected Cash:</span>
                    <span>{formatCurrency(report.expected_cash)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Closing Cash:</span>
                    <span>{formatCurrency(report.closing_cash)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Difference:</span>
                    <span className={report.difference < 0 ? 'text-destructive' : report.difference > 0 ? 'text-green-600' : ''}>
                      {report.difference > 0 ? '+' : ''}{formatCurrency(report.difference)}
                      {report.difference < 0 && <AlertTriangle className="h-3 w-3 inline ml-1" />}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Room Activity */}
              {(report.check_ins > 0 || report.check_outs > 0) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1">
                      <BedDouble className="h-4 w-4" /> Room Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Check-ins:</span>
                      <Badge variant="secondary">{report.check_ins}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Check-outs:</span>
                      <Badge variant="secondary">{report.check_outs}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Rooms Occupied:</span>
                      <span>{report.occupied_rooms}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rooms Available:</span>
                      <span>{report.available_rooms}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Kitchen Items */}
              {Object.keys(report.kitchen_sales || {}).length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1">
                      <UtensilsCrossed className="h-4 w-4" /> Kitchen Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      {Object.entries(report.kitchen_sales).map(([name, qty]) => (
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
              {Object.keys(report.bar_sales || {}).length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1">
                      <Wine className="h-4 w-4" /> Bar Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      {Object.entries(report.bar_sales).map(([name, qty]) => (
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
          </ScrollArea>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={handlePrintReport}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button className="flex-1" onClick={handleDone}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StopCircle className="h-5 w-5 text-destructive" />
            Close Shift
          </DialogTitle>
          <DialogDescription>
            {activeStaff?.first_name}'s {activeShift?.shift_label} shift • Opened at {activeShift ? format(new Date(activeShift.opened_at), 'p') : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Closing Cash *
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
              placeholder="Count and enter total cash in drawer"
            />
          </div>

          <div className="space-y-2">
            <Label>Closing Notes (optional)</Label>
            <Textarea
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              placeholder="Any issues, handover notes..."
              rows={3}
            />
          </div>

          <Button
            className="w-full"
            variant="destructive"
            onClick={handleCloseShift}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <StopCircle className="h-5 w-5 mr-2" />
                Close Shift & Generate Report
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
