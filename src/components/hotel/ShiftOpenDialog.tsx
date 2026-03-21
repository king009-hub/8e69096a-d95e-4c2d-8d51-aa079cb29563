import { useState } from 'react';
import { useStaffSession } from '@/contexts/StaffSessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, DollarSign, PlayCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ShiftOpenDialog() {
  const { activeStaff, openShift } = useStaffSession();
  const [shiftLabel, setShiftLabel] = useState('morning');
  const [openingCash, setOpeningCash] = useState('0');
  const [openingNotes, setOpeningNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenShift = async () => {
    setIsLoading(true);
    const result = await openShift({
      shift_label: shiftLabel,
      opening_cash: parseFloat(openingCash) || 0,
      opening_notes: openingNotes || undefined,
    });
    setIsLoading(false);

    if (result.success) {
      toast.success('Shift opened successfully!');
    } else {
      toast.error(result.error || 'Failed to open shift');
    }
  };

  return (
    <div className="h-full bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 p-4 bg-primary/10 rounded-full w-fit">
            <Clock className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Open Shift</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome, {activeStaff?.first_name}! Open your shift to start working.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Shift</Label>
            <Select value={shiftLabel} onValueChange={setShiftLabel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning Shift</SelectItem>
                <SelectItem value="afternoon">Afternoon Shift</SelectItem>
                <SelectItem value="night">Night Shift</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Opening Cash
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={openingNotes}
              onChange={(e) => setOpeningNotes(e.target.value)}
              placeholder="Any notes about the start of your shift..."
              rows={3}
            />
          </div>

          <Button
            className="w-full h-12 text-base"
            onClick={handleOpenShift}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <PlayCircle className="h-5 w-5 mr-2" />
                Start Shift
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
