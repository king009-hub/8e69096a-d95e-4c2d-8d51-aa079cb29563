import { useState, useMemo, useEffect, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { useAvailableServices } from "@/hooks/useServiceMenu";
import { useActiveServiceCategories } from "@/hooks/useServiceCategories";
import { useHotelBookings, useHotelInfo } from "@/hooks/useHotel";
import { useHotelPOS, HotelPOSPayment } from "@/hooks/useHotelPOS";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  BedDouble,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  Receipt,
  X,
  User,
  Clock,
  Utensils,
  Wine,
  Sparkles,
  ShoppingBag,
  Coffee,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const categoryIcons: Record<string, any> = {
  food: Utensils,
  beverages: Wine,
  minibar: Coffee,
  laundry: Sparkles,
  spa: Sparkles,
  other: ShoppingBag,
};

export default function HotelPOS() {
  const { formatCurrency } = useSettingsContext();
  const { data: services = [], isLoading: servicesLoading } = useAvailableServices();
  const { data: categories = [] } = useActiveServiceCategories();
  const { data: bookings = [] } = useHotelBookings();
  const { data: hotelInfo } = useHotelInfo();
  
  const {
    cart,
    selectedBooking,
    discount,
    subtotal,
    discountAmount,
    taxRate,
    taxAmount,
    total,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    setSelectedBooking,
    setDiscount,
    chargeToRoom,
    processDirectPayment,
  } = useHotelPOS();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showRoomSelector, setShowRoomSelector] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'bank_transfer'>('cash');
  const [paidAmount, setPaidAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter active (checked-in) bookings for room selection
  const activeBookings = useMemo(() => 
    bookings.filter(b => b.status === 'checked_in'),
    [bookings]
  );

  // Filter services by category and search
  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesCategory = activeCategory === "all" || service.category === activeCategory;
      const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [services, activeCategory, searchTerm]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showPaymentDialog) {
          setShowPaymentDialog(false);
        } else if (showRoomSelector) {
          setShowRoomSelector(false);
        }
      }
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'F8' && cart.length > 0) {
        e.preventDefault();
        setShowPaymentDialog(true);
      }
      if (e.key === 'F9' && cart.length > 0 && selectedBooking) {
        e.preventDefault();
        handleChargeToRoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, selectedBooking, showPaymentDialog, showRoomSelector]);

  const handleChargeToRoom = async () => {
    setIsProcessing(true);
    await chargeToRoom();
    setIsProcessing(false);
  };

  const handlePayment = async () => {
    const amount = parseFloat(paidAmount) || total;
    if (amount < total) {
      return;
    }
    
    setIsProcessing(true);
    const result = await processDirectPayment([{ method: paymentMethod, amount }]);
    setIsProcessing(false);
    
    if (result) {
      setShowPaymentDialog(false);
      setPaidAmount("");
    }
  };

  const numpadClick = (value: string) => {
    if (value === "C") {
      setPaidAmount("");
    } else if (value === ".") {
      if (!paidAmount.includes(".")) {
        setPaidAmount(prev => prev + ".");
      }
    } else {
      setPaidAmount(prev => prev + value);
    }
  };

  const change = parseFloat(paidAmount) - total;

  if (servicesLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-foreground">Hotel POS</h1>
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {new Date().toLocaleTimeString()}
            </Badge>
          </div>
          
          {/* Selected Room Display */}
          <Button
            variant={selectedBooking ? "default" : "outline"}
            className="gap-2"
            onClick={() => setShowRoomSelector(true)}
          >
            <BedDouble className="h-4 w-4" />
            {selectedBooking ? (
              <span>
                Room {selectedBooking.room?.room_number} - {selectedBooking.guest?.first_name} {selectedBooking.guest?.last_name}
              </span>
            ) : (
              <span>Select Room (F3)</span>
            )}
          </Button>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>F2: Search</span>
            <span>•</span>
            <span>F8: Pay</span>
            <span>•</span>
            <span>F9: Room Charge</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Menu Items */}
          <div className="flex-1 flex flex-col bg-background">
            {/* Search */}
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search items... (F2)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Tabs */}
            <div className="border-b border-border">
              <ScrollArea className="w-full">
                <div className="flex p-2 gap-2">
                  <Button
                    variant={activeCategory === "all" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveCategory("all")}
                    className="shrink-0"
                  >
                    All
                  </Button>
                  {categories.map(cat => {
                    const Icon = categoryIcons[cat.name] || ShoppingBag;
                    return (
                      <Button
                        key={cat.id}
                        variant={activeCategory === cat.name ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setActiveCategory(cat.name)}
                        className="shrink-0 gap-1"
                      >
                        <Icon className="h-4 w-4" />
                        {cat.label}
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Items Grid */}
            <ScrollArea className="flex-1">
              <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredServices.map(service => {
                  const isLowStock = service.track_stock && service.stock_quantity <= service.min_stock_threshold;
                  const isOutOfStock = service.track_stock && service.stock_quantity <= 0;
                  const cartItem = cart.find(item => item.service.id === service.id);
                  
                  return (
                    <Card 
                      key={service.id} 
                      className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] relative ${
                        isOutOfStock ? 'opacity-50' : ''
                      } ${cartItem ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => !isOutOfStock && addToCart(service)}
                    >
                      <CardContent className="p-3">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start justify-between">
                            <span className="font-medium text-sm line-clamp-2">{service.name}</span>
                            {cartItem && (
                              <Badge className="shrink-0 ml-1">{cartItem.quantity}</Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-primary">
                              {formatCurrency(service.price)}
                            </span>
                            {service.track_stock && (
                              <Badge variant={isLowStock ? "destructive" : "secondary"} className="text-xs">
                                {service.stock_quantity}
                              </Badge>
                            )}
                          </div>
                          
                          {isOutOfStock && (
                            <Badge variant="destructive" className="absolute top-2 right-2">
                              Out of Stock
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {filteredServices.length === 0 && (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    No items found
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel - Cart */}
          <div className="w-96 border-l border-border bg-card flex flex-col">
            {/* Cart Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Current Order
              </h2>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Cart Items */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No items in order</p>
                    <p className="text-xs mt-1">Click items to add them</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.service.id} className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.service.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.unit_price)} × {item.quantity}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.service.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.service.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeFromCart(item.service.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <span className="font-semibold text-sm w-20 text-right">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Cart Summary */}
            <div className="border-t border-border p-4 space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({discount}%)</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST ({taxRate}%)</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-12"
                  disabled={cart.length === 0 || !selectedBooking || isProcessing}
                  onClick={handleChargeToRoom}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <BedDouble className="h-4 w-4 mr-2" />
                  )}
                  Room Charge
                </Button>
                
                <Button
                  className="h-12"
                  disabled={cart.length === 0 || isProcessing}
                  onClick={() => setShowPaymentDialog(true)}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Room Selector Dialog */}
      <Dialog open={showRoomSelector} onOpenChange={setShowRoomSelector}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Room / Guest</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="grid grid-cols-2 gap-3 p-2">
              {activeBookings.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  No checked-in guests
                </div>
              ) : (
                activeBookings.map(booking => (
                  <Card
                    key={booking.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedBooking?.id === booking.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => {
                      setSelectedBooking(booking);
                      setShowRoomSelector(false);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <BedDouble className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-lg">Room {booking.room?.room_number}</div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            {booking.guest?.first_name} {booking.guest?.last_name}
                          </div>
                          <Badge variant="secondary" className="mt-2">
                            {booking.room?.room_type}
                          </Badge>
                        </div>
                        {selectedBooking?.id === booking.id && (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowRoomSelector(false)}>
              Cancel
            </Button>
            {selectedBooking && (
              <Button variant="destructive" onClick={() => {
                setSelectedBooking(null);
                setShowRoomSelector(false);
              }}>
                Clear Selection
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Amount Display */}
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Amount Due</p>
              <p className="text-4xl font-bold text-primary">{formatCurrency(total)}</p>
            </div>

            {/* Payment Method */}
            <div className="space-y-3">
              <Label>Payment Method</Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as any)}
                className="grid grid-cols-2 gap-3"
              >
                <Label
                  htmlFor="cash"
                  className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'cash' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                  }`}
                >
                  <RadioGroupItem value="cash" id="cash" />
                  <Banknote className="h-5 w-5" />
                  <span>Cash</span>
                </Label>
                
                <Label
                  htmlFor="card"
                  className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'card' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                  }`}
                >
                  <RadioGroupItem value="card" id="card" />
                  <CreditCard className="h-5 w-5" />
                  <span>Card</span>
                </Label>
                
                <Label
                  htmlFor="upi"
                  className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'upi' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                  }`}
                >
                  <RadioGroupItem value="upi" id="upi" />
                  <Smartphone className="h-5 w-5" />
                  <span>UPI</span>
                </Label>
                
                <Label
                  htmlFor="bank_transfer"
                  className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'bank_transfer' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                  }`}
                >
                  <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                  <Building2 className="h-5 w-5" />
                  <span>Bank Transfer</span>
                </Label>
              </RadioGroup>
            </div>

            {/* Amount Input & Numpad */}
            <div className="space-y-3">
              <Label>Amount Received</Label>
              <Input
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder={total.toFixed(2)}
                className="text-2xl text-center font-mono h-14"
              />
              
              <div className="grid grid-cols-3 gap-2">
                {['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', 'C'].map(key => (
                  <Button
                    key={key}
                    variant={key === 'C' ? 'destructive' : 'outline'}
                    className="h-12 text-lg font-semibold"
                    onClick={() => numpadClick(key)}
                  >
                    {key}
                  </Button>
                ))}
              </div>
              
              {/* Quick Amount Buttons */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setPaidAmount(total.toFixed(2))}
                >
                  Exact
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setPaidAmount((Math.ceil(total / 100) * 100).toString())}
                >
                  Round Up
                </Button>
              </div>
            </div>

            {/* Change Display */}
            {parseFloat(paidAmount) >= total && (
              <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <span className="text-green-600 font-medium">Change</span>
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(change > 0 ? change : 0)}
                </span>
              </div>
            )}

            {/* Process Button */}
            <Button
              className="w-full h-14 text-lg"
              disabled={parseFloat(paidAmount || '0') < total || isProcessing}
              onClick={handlePayment}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Complete Payment
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
