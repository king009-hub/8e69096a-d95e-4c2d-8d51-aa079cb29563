import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInvoiceItems, useAddInvoiceItem, useDeleteInvoiceItem } from '@/hooks/useHotelServices';
import { useAvailableServices, ServiceMenuItem } from '@/hooks/useServiceMenu';
import { useDeductStockForService } from '@/hooks/useHotelStock';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { HotelBooking } from '@/types/hotel';
import { Loader2, Plus, Trash2, Coffee, UtensilsCrossed, Wine, Sparkles, ShoppingBag, Package, AlertTriangle } from 'lucide-react';
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

export function GuestServicesDialog({ open, onOpenChange, booking }: GuestServicesDialogProps) {
  const { formatCurrency } = useSettingsContext();
  const [category, setCategory] = useState<string>('food');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedServiceItem, setSelectedServiceItem] = useState<ServiceMenuItem | null>(null);

  const { data: items, isLoading } = useInvoiceItems(booking.id);
  const { data: menuItems = [] } = useAvailableServices();
  const addItem = useAddInvoiceItem();
  const deleteItem = useDeleteInvoiceItem();
  const deductStock = useDeductStockForService();
  // Group menu items by category with full item data
  const presetServices = useMemo(() => {
    const grouped: Record<string, ServiceMenuItem[]> = {
      food: [],
      beverages: [],
      minibar: [],
      laundry: [],
      other: [],
    };
    
    menuItems.forEach(item => {
      if (grouped[item.category]) {
        grouped[item.category].push(item);
      }
    });
    
    return grouped;
  }, [menuItems]);

  const handleAddService = async () => {
    if (!description || unitPrice <= 0) {
      toast.error('Please enter service details');
      return;
    }

    // Check stock availability if it's a tracked item
    if (selectedServiceItem?.track_stock) {
      if ((selectedServiceItem.stock_quantity || 0) < quantity) {
        toast.error(`Insufficient stock. Only ${selectedServiceItem.stock_quantity} available.`);
        return;
      }
    }

    try {
      // Add the invoice item first
      await addItem.mutateAsync({
        booking_id: booking.id,
        description,
        item_type: category,
        unit_price: unitPrice,
        quantity,
        total_price: unitPrice * quantity,
        service_item_id: selectedServiceItem?.id,
      });

      // Deduct stock ONLY if this is a tracked service item
      // Note: Stock deduction is handled here, NOT in addItem hook
      if (selectedServiceItem?.id && selectedServiceItem.track_stock) {
        await deductStock.mutateAsync({
          serviceItemId: selectedServiceItem.id,
          quantity,
          bookingId: booking.id,
        });
      }

      setDescription('');
      setUnitPrice(0);
      setQuantity(1);
      setSelectedServiceItem(null);
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const handlePresetClick = (item: ServiceMenuItem) => {
    setSelectedServiceItem(item);
    setDescription(item.name);
    setUnitPrice(item.price);
    setCategory(item.category);
  };

  const totalServices = items?.reduce((sum, item) => sum + Number(item.total_price), 0) || 0;
  const CategoryIcon = serviceCategories.find(c => c.value === category)?.icon || ShoppingBag;

  // Check if selected item has low stock
  const isLowStock = selectedServiceItem?.track_stock && 
    (selectedServiceItem.stock_quantity || 0) <= (selectedServiceItem.min_stock_threshold || 5);
  const isOutOfStock = selectedServiceItem?.track_stock && 
    (selectedServiceItem.stock_quantity || 0) === 0;

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
              <Select value={category} onValueChange={(val) => {
                setCategory(val);
                setSelectedServiceItem(null);
              }}>
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

            {/* Quick Add Presets from Database */}
            <div className="space-y-2">
              <Label>Quick Add</Label>
              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                {presetServices[category]?.length > 0 ? (
                  presetServices[category].map((item) => {
                    const outOfStock = item.track_stock && (item.stock_quantity || 0) === 0;
                    const lowStock = item.track_stock && 
                      (item.stock_quantity || 0) <= (item.min_stock_threshold || 5) && 
                      !outOfStock;
                    
                    return (
                      <Button
                        key={item.id}
                        variant={selectedServiceItem?.id === item.id ? "default" : "outline"}
                        size="sm"
                        className="justify-start h-auto py-2 relative"
                        onClick={() => handlePresetClick(item)}
                        disabled={outOfStock}
                      >
                        <div className="flex flex-col items-start gap-0.5 flex-1 min-w-0">
                          <span className="truncate text-left w-full">{item.name}</span>
                          {item.track_stock && (
                            <span className={`text-xs flex items-center gap-1 ${
                              outOfStock ? 'text-destructive' : 
                              lowStock ? 'text-amber-600' : 'text-muted-foreground'
                            }`}>
                              <Package className="h-3 w-3" />
                              {item.stock_quantity} in stock
                            </span>
                          )}
                        </div>
                        <Badge variant="secondary" className="ml-1 shrink-0">{formatCurrency(item.price)}</Badge>
                      </Button>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground col-span-2">
                    No items in this category
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  // Clear selected item if manually editing description
                  if (selectedServiceItem && e.target.value !== selectedServiceItem.name) {
                    setSelectedServiceItem(null);
                  }
                }}
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
                  max={selectedServiceItem?.track_stock ? selectedServiceItem.stock_quantity || 1 : undefined}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            {/* Stock Warning */}
            {selectedServiceItem?.track_stock && (
              <div className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                isOutOfStock ? 'bg-destructive/10 text-destructive' :
                isLowStock ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
                'bg-muted text-muted-foreground'
              }`}>
                {isOutOfStock ? (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    <span>Out of stock</span>
                  </>
                ) : isLowStock ? (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    <span>Low stock: {selectedServiceItem.stock_quantity} remaining</span>
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4" />
                    <span>Stock: {selectedServiceItem.stock_quantity} available (auto-deduct enabled)</span>
                  </>
                )}
              </div>
            )}

            <Button 
              className="w-full gap-2" 
              onClick={handleAddService}
              disabled={addItem.isPending || deductStock.isPending || isOutOfStock}
            >
              {(addItem.isPending || deductStock.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
              <Plus className="h-4 w-4" />
            )}
            Add Service ({formatCurrency(unitPrice * quantity)})
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
                            {item.quantity}x {formatCurrency(Number(item.unit_price))}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{formatCurrency(Number(item.total_price))}</Badge>
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
              Total Services: <span className="text-primary">{formatCurrency(totalServices)}</span>
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
