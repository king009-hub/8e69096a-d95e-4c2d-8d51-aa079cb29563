import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInvoiceItems, useAddInvoiceItem, useDeleteInvoiceItem } from '@/hooks/useHotelServices';
import { HotelBooking } from '@/types/hotel';
import { Loader2, Plus, Trash2, Coffee, UtensilsCrossed, Wine, Sparkles, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

interface GuestServicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: HotelBooking;
}

const serviceCategories = [
  { value: 'food', label: 'Food & Dining', icon: UtensilsCrossed },
  { value: 'beverages', label: 'Beverages', icon: Coffee },
  { value: 'minibar', label: 'Mini Bar', icon: Wine },
  { value: 'laundry', label: 'Laundry', icon: Sparkles },
  { value: 'other', label: 'Other Services', icon: ShoppingBag },
];

const presetServices = {
  food: [
    { description: 'Breakfast', price: 15 },
    { description: 'Lunch', price: 25 },
    { description: 'Dinner', price: 35 },
    { description: 'Room Service - Snacks', price: 12 },
  ],
  beverages: [
    { description: 'Coffee', price: 5 },
    { description: 'Tea', price: 4 },
    { description: 'Soft Drinks', price: 3 },
    { description: 'Fresh Juice', price: 6 },
  ],
  minibar: [
    { description: 'Wine', price: 25 },
    { description: 'Beer', price: 8 },
    { description: 'Spirits', price: 15 },
    { description: 'Snacks', price: 10 },
  ],
  laundry: [
    { description: 'Laundry - Regular', price: 20 },
    { description: 'Laundry - Express', price: 35 },
    { description: 'Dry Cleaning', price: 30 },
    { description: 'Ironing', price: 10 },
  ],
  other: [
    { description: 'Spa Treatment', price: 80 },
    { description: 'Gym Access', price: 15 },
    { description: 'Airport Transfer', price: 50 },
    { description: 'Tour Booking', price: 100 },
  ],
};

export function GuestServicesDialog({ open, onOpenChange, booking }: GuestServicesDialogProps) {
  const [category, setCategory] = useState<string>('food');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);

  const { data: items, isLoading } = useInvoiceItems(booking.id);
  const addItem = useAddInvoiceItem();
  const deleteItem = useDeleteInvoiceItem();

  const handleAddService = async () => {
    if (!description || unitPrice <= 0) {
      toast.error('Please enter service details');
      return;
    }

    await addItem.mutateAsync({
      booking_id: booking.id,
      description,
      item_type: category,
      unit_price: unitPrice,
      quantity,
      total_price: unitPrice * quantity,
    });

    setDescription('');
    setUnitPrice(0);
    setQuantity(1);
  };

  const handlePresetClick = (preset: { description: string; price: number }) => {
    setDescription(preset.description);
    setUnitPrice(preset.price);
  };

  const totalServices = items?.reduce((sum, item) => sum + Number(item.total_price), 0) || 0;
  const CategoryIcon = serviceCategories.find(c => c.value === category)?.icon || ShoppingBag;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CategoryIcon className="h-5 w-5" />
            Guest Services - Room {booking.room?.room_number}
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 flex-1 overflow-hidden">
          {/* Add Service Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Service Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {serviceCategories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <cat.icon className="h-4 w-4" />
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick Add Presets */}
            <div className="space-y-2">
              <Label>Quick Add</Label>
              <div className="grid grid-cols-2 gap-2">
                {presetServices[category as keyof typeof presetServices]?.map((preset, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="justify-start h-auto py-2"
                    onClick={() => handlePresetClick(preset)}
                  >
                    <span className="truncate">{preset.description}</span>
                    <Badge variant="secondary" className="ml-auto">${preset.price}</Badge>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Service description..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unit Price ($)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <Button 
              className="w-full gap-2" 
              onClick={handleAddService}
              disabled={addItem.isPending}
            >
              {addItem.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Service (${(unitPrice * quantity).toFixed(2)})
            </Button>
          </div>

          {/* Current Services List */}
          <div className="flex flex-col">
            <Label className="mb-2">Current Services</Label>
            <ScrollArea className="flex-1 border rounded-lg">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : items?.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  No services added yet
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {items?.map(item => (
                    <Card key={item.id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{item.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity}x ${Number(item.unit_price).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">${Number(item.total_price).toFixed(2)}</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => deleteItem.mutate(item.id)}
                            disabled={deleteItem.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <div className="text-lg font-bold">
              Total Services: <span className="text-primary">${totalServices.toFixed(2)}</span>
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
