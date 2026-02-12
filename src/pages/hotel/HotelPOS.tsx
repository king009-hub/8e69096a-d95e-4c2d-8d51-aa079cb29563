import { useState, useMemo, useEffect, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { useAvailableServices } from "@/hooks/useServiceMenu";
import { useActiveServiceCategories } from "@/hooks/useServiceCategories";
import { useHotelBookings, useHotelInfo } from "@/hooks/useHotel";
import { useHotelPOS, HotelPOSPayment, HotelCartItem } from "@/hooks/useHotelPOS";
import { useOrderTemplates } from "@/hooks/useOrderTemplates";
import { usePlaceOrder, useWaiterOrders, useBillOrders, useUpdateOrderStatus, useAddItemsToOrder, HotelOrder } from "@/hooks/useHotelOrders";
import { useStaffSession } from "@/contexts/StaffSessionContext";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { HotelReceiptPrint } from "@/components/hotel/HotelReceiptPrint";
import { KOTPrint, getStationForCategory } from "@/components/hotel/KOTPrint";
import { HotelBooking } from "@/types/hotel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Search, Plus, Minus, Trash2, BedDouble, CreditCard, Banknote,
  Smartphone, Building2, Receipt, Printer, X, User, Clock,
  Utensils, Wine, Sparkles, ShoppingBag, Coffee, Loader2,
  CheckCircle2, Package, Zap, SplitSquareHorizontal, Send,
  ClipboardList, MessageSquare, Bell, ChefHat, FileText,
} from "lucide-react";

const categoryIcons: Record<string, any> = {
  food: Utensils, beverages: Wine, minibar: Coffee,
  laundry: Sparkles, spa: Sparkles, other: ShoppingBag,
};

const templateIcons: Record<string, any> = {
  breakfast: Coffee, lunch: Utensils, dinner: Utensils,
  minibar: Wine, package: Package, general: Zap,
};

const orderStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "destructive" },
  preparing: { label: "Preparing", variant: "default" },
  ready: { label: "Ready", variant: "secondary" },
  served: { label: "Served", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  billed: { label: "Billed", variant: "outline" },
};

type PaymentMethodType = 'cash' | 'card' | 'upi' | 'bank_transfer';

interface SplitPayment {
  method: PaymentMethodType;
  amount: number;
}

export default function HotelPOS() {
  const { formatCurrency } = useSettingsContext();
  const { activeStaff } = useStaffSession();
  const { data: services = [], isLoading: servicesLoading } = useAvailableServices();
  const { data: categories = [] } = useActiveServiceCategories();
  const { data: bookings = [] } = useHotelBookings();
  const { data: hotelInfo } = useHotelInfo();
  const { data: templates = [] } = useOrderTemplates();
  const placeOrder = usePlaceOrder();
  const addItemsToOrder = useAddItemsToOrder();
  const billOrders = useBillOrders();
  const updateOrderStatus = useUpdateOrderStatus();

  const waiterId = activeStaff?.staff_id;
  const { data: myOrders = [] } = useWaiterOrders(waiterId);

  const hotelTaxRate = hotelInfo?.tax_rate ?? 18;

  const {
    cart, selectedBooking, discount, subtotal, discountAmount,
    taxRate, taxAmount, total, addToCart, updateQuantity,
    removeFromCart, clearCart, setSelectedBooking, setDiscount,
    chargeToRoom, processDirectPayment,
  } = useHotelPOS(hotelTaxRate);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showRoomSelector, setShowRoomSelector] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('cash');
  const [paidAmount, setPaidAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([]);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [rightTab, setRightTab] = useState<"cart" | "orders">("cart");

  // Item notes
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  // Table number for walk-in orders
  const [tableNumber, setTableNumber] = useState("");
  // Order notes
  const [orderNotes, setOrderNotes] = useState("");
  // Show bill dialog
  const [showBillDialog, setShowBillDialog] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  // Adding items to an existing order
  const [addingToOrder, setAddingToOrder] = useState<HotelOrder | null>(null);

  // KOT print state
  const [kotQueue, setKotQueue] = useState<Array<{
    orderNumber: string;
    station: 'kitchen' | 'bar';
    tableNumber?: string | null;
    roomNumber?: string | null;
    waiterName?: string;
    items: Array<{ name: string; quantity: number; notes?: string | null }>;
    orderNotes?: string;
    timestamp: Date;
  }>>([]);
  const [currentKOT, setCurrentKOT] = useState<typeof kotQueue[0] | null>(null);

  // Notification for ready orders
  const [notifiedReady, setNotifiedReady] = useState<Set<string>>(new Set());

  useEffect(() => {
    const readyOrders = myOrders.filter(o => o.status === 'ready' && !notifiedReady.has(o.id));
    if (readyOrders.length > 0) {
      readyOrders.forEach(o => {
        toast.success(`🔔 Order ${o.order_number} is READY!`, {
          description: o.room ? `Room ${o.room.room_number}` : o.table_number ? `Table ${o.table_number}` : 'Walk-in',
          duration: 10000,
        });
      });
      setNotifiedReady(prev => {
        const next = new Set(prev);
        readyOrders.forEach(o => next.add(o.id));
        return next;
      });
    }
  }, [myOrders]);

  const [receiptData, setReceiptData] = useState<{
    invoiceNumber: string; items: HotelCartItem[]; subtotal: number;
    discount: number; discountAmount: number; taxRate: number;
    taxAmount: number; total: number; paymentMethod: string;
    splitPayments?: SplitPayment[]; paidAmount?: number;
    changeAmount?: number; booking?: HotelBooking | null; isRoomCharge: boolean;
  } | null>(null);
  const [lastReceiptData, setLastReceiptData] = useState<typeof receiptData>(null);

  const totalPaid = splitPayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingAmount = total - totalPaid;

  const activeBookings = useMemo(() =>
    bookings.filter(b => b.status === 'checked_in'),
    [bookings]
  );

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
        if (showPaymentDialog) { setShowPaymentDialog(false); resetPaymentState(); }
        else if (showRoomSelector) setShowRoomSelector(false);
        else if (showTemplates) setShowTemplates(false);
      }
      if (e.key === 'F2') { e.preventDefault(); searchInputRef.current?.focus(); }
      if (e.key === 'F3') { e.preventDefault(); setShowTemplates(true); }
      if (e.key === 'F7' && cart.length > 0) { e.preventDefault(); handlePlaceOrder(); }
      if (e.key === 'F8' && cart.length > 0) { e.preventDefault(); setShowPaymentDialog(true); }
      if (e.key === 'F9' && cart.length > 0 && selectedBooking) { e.preventDefault(); handleChargeToRoom(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, selectedBooking, showPaymentDialog, showRoomSelector, showTemplates]);

  useEffect(() => {
    if (receiptData) {
      setLastReceiptData(receiptData);
      const timer = setTimeout(() => setReceiptData(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [receiptData]);

  const handleReprintReceipt = () => {
    if (lastReceiptData) { setReceiptData(lastReceiptData); toast.success("Reprinting last receipt..."); }
    else toast.error("No receipt to reprint");
  };

  const resetPaymentState = () => {
    setPaidAmount(""); setSplitPayments([]); setIsSplitMode(false);
  };

  // Process KOT queue
  useEffect(() => {
    if (kotQueue.length > 0 && !currentKOT) {
      setCurrentKOT(kotQueue[0]);
      setKotQueue(prev => prev.slice(1));
    }
  }, [kotQueue, currentKOT]);

  const handleKOTPrintComplete = () => {
    setCurrentKOT(null);
  };

  // Place order (waiter workflow - order first, bill later)
  const handlePlaceOrder = async () => {
    if (cart.length === 0) { toast.error("Cart is empty"); return; }
    if (!waiterId) { toast.error("Staff not logged in"); return; }

    setIsProcessing(true);
    try {
      const order = await placeOrder.mutateAsync({
        bookingId: selectedBooking?.id || null,
        roomId: selectedBooking?.room_id || null,
        tableNumber: tableNumber || null,
        waiterId,
        notes: orderNotes || undefined,
        taxRate,
        discount,
        items: cart.map(item => ({
          serviceItemId: item.service.id,
          name: item.service.name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          notes: itemNotes[item.service.id] || undefined,
          category: item.service.category,
        })),
      });

      // Generate KOT tickets split by station
      const waiterName = activeStaff ? `${activeStaff.first_name} ${activeStaff.last_name}` : undefined;
      const roomNumber = selectedBooking?.room?.room_number || null;

      const stationItems: Record<string, Array<{ name: string; quantity: number; notes?: string | null }>> = {};
      for (const item of cart) {
        const station = getStationForCategory(item.service.category);
        const stationKey = station === 'other' ? 'kitchen' : station; // 'other' goes to kitchen
        if (!stationItems[stationKey]) stationItems[stationKey] = [];
        stationItems[stationKey].push({
          name: item.service.name,
          quantity: item.quantity,
          notes: itemNotes[item.service.id] || null,
        });
      }

      const kots = Object.entries(stationItems).map(([station, items]) => ({
        orderNumber: order.order_number,
        station: station as 'kitchen' | 'bar',
        tableNumber: tableNumber || null,
        roomNumber,
        waiterName,
        items,
        orderNotes: orderNotes || undefined,
        timestamp: new Date(),
      }));

      setKotQueue(kots);

      clearCart();
      setItemNotes({});
      setOrderNotes("");
      setTableNumber("");
      setRightTab("orders");
    } catch {
      // error handled by mutation
    } finally {
      setIsProcessing(false);
    }
  };

  // Add extra items to an existing order
  const handleAddItemsToOrder = async () => {
    if (!addingToOrder || cart.length === 0) return;
    if (!waiterId) { toast.error("Staff not logged in"); return; }

    setIsProcessing(true);
    try {
      const result = await addItemsToOrder.mutateAsync({
        orderId: addingToOrder.id,
        orderNumber: addingToOrder.order_number,
        taxRate,
        items: cart.map(item => ({
          serviceItemId: item.service.id,
          name: item.service.name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          notes: itemNotes[item.service.id] || undefined,
          category: item.service.category,
        })),
      });

      // Generate KOT for new items only
      const waiterName = activeStaff ? `${activeStaff.first_name} ${activeStaff.last_name}` : undefined;
      const roomNumber = addingToOrder.room?.room_number || null;

      const stationItems: Record<string, Array<{ name: string; quantity: number; notes?: string | null }>> = {};
      for (const item of cart) {
        const station = getStationForCategory(item.service.category);
        const stationKey = station === 'other' ? 'kitchen' : station;
        if (!stationItems[stationKey]) stationItems[stationKey] = [];
        stationItems[stationKey].push({
          name: item.service.name,
          quantity: item.quantity,
          notes: itemNotes[item.service.id] || null,
        });
      }

      const kots = Object.entries(stationItems).map(([station, items]) => ({
        orderNumber: `${addingToOrder.order_number} (EXTRA)`,
        station: station as 'kitchen' | 'bar',
        tableNumber: addingToOrder.table_number || null,
        roomNumber,
        waiterName,
        items,
        orderNotes: orderNotes || undefined,
        timestamp: new Date(),
      }));

      setKotQueue(kots);

      clearCart();
      setItemNotes({});
      setOrderNotes("");
      setAddingToOrder(null);
      setRightTab("orders");
    } catch {
      // error handled by mutation
    } finally {
      setIsProcessing(false);
    }
  };

  const startAddingToOrder = (order: HotelOrder) => {
    clearCart();
    setItemNotes({});
    setOrderNotes("");
    setAddingToOrder(order);
    // Pre-fill table/room context
    if (order.table_number) setTableNumber(order.table_number);
    if (order.booking_id && order.room_id) {
      const booking = activeBookings.find(b => b.id === order.booking_id);
      if (booking) setSelectedBooking(booking);
    }
    setRightTab("cart");
    toast.info(`Adding items to ${order.order_number}. Add items and click "Add to Order".`);
  };

  const cancelAddingToOrder = () => {
    setAddingToOrder(null);
    clearCart();
    setItemNotes({});
    setOrderNotes("");
  };

  const handleChargeToRoom = async () => {
    if (!selectedBooking) return;
    const receiptItems = [...cart];
    const rSubtotal = subtotal, rDiscount = discount, rDiscountAmt = discountAmount;
    const rTaxRate = taxRate, rTaxAmt = taxAmount, rTotal = total;
    const rBooking = selectedBooking;
    setIsProcessing(true);
    const result = await chargeToRoom();
    setIsProcessing(false);
    if (result) {
      setReceiptData({
        invoiceNumber: `RC-${Date.now().toString(36).toUpperCase()}`,
        items: receiptItems, subtotal: rSubtotal, discount: rDiscount,
        discountAmount: rDiscountAmt, taxRate: rTaxRate, taxAmount: rTaxAmt,
        total: rTotal, paymentMethod: 'room_charge', booking: rBooking, isRoomCharge: true,
      });
    }
  };

  const addSplitPayment = () => {
    const amount = parseFloat(paidAmount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    if (amount > remainingAmount + 0.01) { toast.error("Amount exceeds remaining balance"); return; }
    setSplitPayments(prev => [...prev, { method: paymentMethod, amount }]);
    setPaidAmount("");
  };

  const removeSplitPayment = (index: number) => {
    setSplitPayments(prev => prev.filter((_, i) => i !== index));
  };

  const handlePayment = async () => {
    let paymentsToProcess: HotelPOSPayment[];
    let paidAmt = 0;
    if (isSplitMode) {
      if (remainingAmount > 0.01) { toast.error(`Remaining: ${formatCurrency(remainingAmount)}`); return; }
      paymentsToProcess = splitPayments;
      paidAmt = splitPayments.reduce((sum, p) => sum + p.amount, 0);
    } else {
      const amount = parseFloat(paidAmount) || total;
      if (amount < total - 0.01) { toast.error("Insufficient payment"); return; }
      paymentsToProcess = [{ method: paymentMethod, amount }];
      paidAmt = amount;
    }
    const receiptItems = [...cart];
    const rSubtotal = subtotal, rDiscount = discount, rDiscountAmt = discountAmount;
    const rTaxRate = taxRate, rTaxAmt = taxAmount, rTotal = total;
    const rBooking = selectedBooking;
    const rSplit = isSplitMode ? [...splitPayments] : undefined;
    const changeAmt = !isSplitMode && paidAmt > rTotal ? paidAmt - rTotal : 0;
    setIsProcessing(true);
    const result = await processDirectPayment(paymentsToProcess);
    setIsProcessing(false);
    if (result) {
      setReceiptData({
        invoiceNumber: typeof result === 'object' && result.invoice_number ? result.invoice_number : `INV-${Date.now().toString(36).toUpperCase()}`,
        items: receiptItems, subtotal: rSubtotal, discount: rDiscount,
        discountAmount: rDiscountAmt, taxRate: rTaxRate, taxAmount: rTaxAmt,
        total: rTotal, paymentMethod: paymentsToProcess[0].method,
        splitPayments: rSplit, paidAmount: paidAmt, changeAmount: changeAmt,
        booking: rBooking, isRoomCharge: false,
      });
      setShowPaymentDialog(false);
      resetPaymentState();
    }
  };

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template || !template.items) return;
    let addedCount = 0;
    for (const item of template.items) {
      if (item.service_item) { const success = addToCart(item.service_item, item.quantity); if (success) addedCount++; }
    }
    if (addedCount > 0) toast.success(`Added ${template.name} (${addedCount} items)`);
    setShowTemplates(false);
  };

  const numpadClick = (value: string) => {
    if (value === "C") setPaidAmount("");
    else if (value === ".") { if (!paidAmount.includes(".")) setPaidAmount(prev => prev + "."); }
    else setPaidAmount(prev => prev + value);
  };

  // Bill selected orders
  const handleBillOrders = async () => {
    if (selectedOrderIds.length === 0) { toast.error("Select orders to bill"); return; }
    setIsProcessing(true);
    try {
      await billOrders.mutateAsync({
        orderIds: selectedOrderIds,
        bookingId: selectedBooking?.id,
        guestId: selectedBooking?.guest_id,
        paymentMethod: 'cash',
        paymentStatus: selectedBooking ? 'pending' : 'paid',
      });
      setSelectedOrderIds([]);
      setShowBillDialog(false);
    } catch { /* handled */ } finally {
      setIsProcessing(false);
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const change = isSplitMode ? 0 : parseFloat(paidAmount) - total;
  const paymentMethods = [
    { id: 'cash', label: 'Cash', icon: Banknote },
    { id: 'card', label: 'Card', icon: CreditCard },
    { id: 'upi', label: 'UPI', icon: Smartphone },
    { id: 'bank_transfer', label: 'Bank', icon: Building2 },
  ];

  // Count ready orders for notification badge
  const readyCount = myOrders.filter(o => o.status === 'ready').length;

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
            {activeStaff && (
              <Badge variant="outline" className="text-xs">
                <User className="h-3 w-3 mr-1" />
                {activeStaff.first_name} {activeStaff.last_name}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {new Date().toLocaleTimeString()}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)} className="gap-1">
              <Zap className="h-4 w-4" /> Quick Orders (F3)
            </Button>

            {/* Table Number */}
            <div className="flex items-center gap-1">
              <Input
                placeholder="Table #"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="w-20 h-9 text-sm"
              />
            </div>

            <Button
              variant={selectedBooking ? "default" : "outline"}
              className="gap-2"
              onClick={() => setShowRoomSelector(true)}
            >
              <BedDouble className="h-4 w-4" />
              {selectedBooking ? (
                <span>Room {selectedBooking.room?.room_number} - {selectedBooking.guest?.first_name}</span>
              ) : (
                <span>Select Room</span>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>F2: Search</span><span>•</span>
            <span>F7: Place Order</span><span>•</span>
            <span>F8: Pay</span><span>•</span>
            <span>F9: Room</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Menu Items */}
          <div className="flex-1 flex flex-col bg-background">
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input ref={searchInputRef} placeholder="Search items... (F2)" value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </div>

            <div className="border-b border-border">
              <ScrollArea className="w-full">
                <div className="flex p-2 gap-2">
                  <Button variant={activeCategory === "all" ? "default" : "ghost"} size="sm"
                    onClick={() => setActiveCategory("all")} className="shrink-0">All</Button>
                  {categories.map(cat => {
                    const Icon = categoryIcons[cat.name] || ShoppingBag;
                    return (
                      <Button key={cat.id} variant={activeCategory === cat.name ? "default" : "ghost"} size="sm"
                        onClick={() => setActiveCategory(cat.name)} className="shrink-0 gap-1">
                        <Icon className="h-4 w-4" />{cat.label}
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredServices.map(service => {
                  const isLowStock = service.track_stock && service.stock_quantity <= service.min_stock_threshold;
                  const isOutOfStock = service.track_stock && service.stock_quantity <= 0;
                  const cartItem = cart.find(item => item.service.id === service.id);
                  return (
                    <Card key={service.id}
                      className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] relative ${isOutOfStock ? 'opacity-50' : ''} ${cartItem ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => !isOutOfStock && addToCart(service)}>
                      <CardContent className="p-3">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start justify-between">
                            <span className="font-medium text-sm line-clamp-2">{service.name}</span>
                            {cartItem && <Badge className="shrink-0 ml-1">{cartItem.quantity}</Badge>}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-primary">{formatCurrency(service.price)}</span>
                            {service.track_stock && (
                              <Badge variant={isLowStock ? "destructive" : "secondary"} className="text-xs">
                                {service.stock_quantity}
                              </Badge>
                            )}
                          </div>
                          {isOutOfStock && <Badge variant="destructive" className="absolute top-2 right-2">Out</Badge>}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {filteredServices.length === 0 && (
                  <div className="col-span-full text-center py-12 text-muted-foreground">No items found</div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel - Cart & Orders */}
          <div className="w-[420px] border-l border-border bg-card flex flex-col">
            <Tabs value={rightTab} onValueChange={(v) => setRightTab(v as any)} className="flex flex-col h-full">
              <TabsList className="w-full rounded-none border-b border-border h-11">
                <TabsTrigger value="cart" className="flex-1 gap-1">
                  <Receipt className="h-4 w-4" /> Cart
                  {cart.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{cart.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="orders" className="flex-1 gap-1 relative">
                  <ClipboardList className="h-4 w-4" /> My Orders
                  {readyCount > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 px-1.5 animate-pulse">{readyCount}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Cart Tab */}
              <TabsContent value="cart" className="flex-1 flex flex-col m-0 overflow-hidden">
                <div className="p-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-sm">
                      {addingToOrder ? `Adding to ${addingToOrder.order_number}` : 'Current Order'}
                    </h2>
                    {addingToOrder && (
                      <Badge variant="secondary" className="text-xs animate-pulse">
                        <Plus className="h-3 w-3 mr-1" /> Extra Items
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {addingToOrder && (
                      <Button variant="ghost" size="sm" onClick={cancelAddingToOrder}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                    )}
                    {lastReceiptData && !addingToOrder && (
                      <Button variant="ghost" size="sm" onClick={handleReprintReceipt} title="Reprint last receipt">
                        <Printer className="h-4 w-4 mr-1" /> Reprint
                      </Button>
                    )}
                    {cart.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => { clearCart(); setItemNotes({}); setOrderNotes(""); }}>
                        <X className="h-4 w-4 mr-1" /> Clear
                      </Button>
                    )}
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-2">
                    {cart.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No items in order</p>
                        <p className="text-xs mt-1">Click items or use Quick Orders</p>
                      </div>
                    ) : (
                      cart.map(item => (
                        <div key={item.service.id} className="bg-muted/50 rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.service.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(item.unit_price)} × {item.quantity}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="icon" className="h-7 w-7"
                                onClick={() => updateQuantity(item.service.id, item.quantity - 1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                              <Button variant="outline" size="icon" className="h-7 w-7"
                                onClick={() => updateQuantity(item.service.id, item.quantity + 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => removeFromCart(item.service.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <span className="font-semibold text-sm w-16 text-right">
                              {formatCurrency(item.quantity * item.unit_price)}
                            </span>
                          </div>
                          {/* Item Notes */}
                          <Input
                            placeholder="Special instructions (e.g. no onions, extra spicy)"
                            value={itemNotes[item.service.id] || ""}
                            onChange={(e) => setItemNotes(prev => ({ ...prev, [item.service.id]: e.target.value }))}
                            className="h-7 text-xs"
                          />
                        </div>
                      ))
                    )}
                    {/* Order-level notes */}
                    {cart.length > 0 && (
                      <div className="pt-2">
                        <Label className="text-xs text-muted-foreground">Order Notes</Label>
                        <Textarea
                          placeholder="Any special instructions for this order..."
                          value={orderNotes}
                          onChange={(e) => setOrderNotes(e.target.value)}
                          className="mt-1 text-xs min-h-[40px]"
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Cart Summary & Actions */}
                <div className="border-t border-border p-3 space-y-3">
                  <div className="space-y-1 text-sm">
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

                  {/* Primary: Place Order or Add Items */}
                  {addingToOrder ? (
                    <Button
                      className="w-full h-12 text-base"
                      disabled={cart.length === 0 || isProcessing}
                      onClick={handleAddItemsToOrder}
                    >
                      {isProcessing ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Adding...</>
                      ) : (
                        <><Plus className="h-4 w-4 mr-2" /> Add to {addingToOrder.order_number}</>
                      )}
                    </Button>
                  ) : (
                    <Button
                      className="w-full h-12 text-base"
                      disabled={cart.length === 0 || isProcessing || !waiterId}
                      onClick={handlePlaceOrder}
                    >
                      {isProcessing ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Placing...</>
                      ) : (
                        <><Send className="h-4 w-4 mr-2" /> Place Order (F7)</>
                      )}
                    </Button>
                  )}

                  {/* Secondary: Direct billing options */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="h-10 text-xs"
                      disabled={cart.length === 0 || !selectedBooking || isProcessing}
                      onClick={handleChargeToRoom}>
                      <BedDouble className="h-3 w-3 mr-1" /> Room Charge
                    </Button>
                    <Button variant="outline" className="h-10 text-xs"
                      disabled={cart.length === 0 || isProcessing}
                      onClick={() => setShowPaymentDialog(true)}>
                      <CreditCard className="h-3 w-3 mr-1" /> Direct Pay
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* My Orders Tab */}
              <TabsContent value="orders" className="flex-1 flex flex-col m-0 overflow-hidden">
                <div className="p-3 border-b border-border flex items-center justify-between">
                  <h2 className="font-semibold text-sm">My Active Orders</h2>
                  <Button
                    variant="default" size="sm"
                    disabled={selectedOrderIds.length === 0}
                    onClick={() => setShowBillDialog(true)}
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Bill Selected ({selectedOrderIds.length})
                  </Button>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-3">
                    {myOrders.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No active orders</p>
                        <p className="text-xs mt-1">Place an order to see it here</p>
                      </div>
                    ) : (
                      myOrders.filter(o => !o.is_billed).map(order => {
                        const config = orderStatusConfig[order.status] || orderStatusConfig.pending;
                        const isSelected = selectedOrderIds.includes(order.id);
                        const canBill = order.status === 'served' || order.status === 'ready';
                        return (
                          <Card key={order.id} className={`transition-all ${isSelected ? 'ring-2 ring-primary' : ''} ${order.status === 'ready' ? 'border-green-500 border-2' : ''}`}>
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {canBill && (
                                    <input type="checkbox" checked={isSelected}
                                      onChange={() => toggleOrderSelection(order.id)}
                                      className="h-4 w-4 rounded border-border" />
                                  )}
                                  <span className="font-bold text-sm">{order.order_number}</span>
                                </div>
                                <Badge variant={config.variant}>{config.label}</Badge>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                {order.room && (
                                  <span className="flex items-center gap-1">
                                    <BedDouble className="h-3 w-3" /> Room {order.room.room_number}
                                  </span>
                                )}
                                {order.table_number && <span>Table {order.table_number}</span>}
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                                </span>
                              </div>

                              {/* Items */}
                              <div className="space-y-1 text-xs">
                                {order.items?.map(item => (
                                  <div key={item.id} className="flex justify-between items-center">
                                    <span>
                                      {item.quantity}× {item.name}
                                      {item.notes && (
                                        <span className="text-orange-500 ml-1">
                                          <MessageSquare className="h-3 w-3 inline" /> {item.notes}
                                        </span>
                                      )}
                                    </span>
                                    <span className="font-medium">{formatCurrency(item.total_price)}</span>
                                  </div>
                                ))}
                              </div>

                              <Separator />

                              <div className="flex justify-between font-semibold text-sm">
                                <span>Total</span>
                                <span className="text-primary">{formatCurrency(order.total_amount)}</span>
                              </div>

                              {/* Ready notification */}
                              {order.status === 'ready' && (
                                <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950 p-2 rounded text-sm font-medium">
                                  <Bell className="h-4 w-4" />
                                  Order is ready! Serve to guest.
                                </div>
                              )}

                              {order.status === 'ready' && (
                                <Button variant="outline" size="sm" className="w-full"
                                  onClick={() => updateOrderStatus.mutate({ orderId: order.id, status: 'served' })}>
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Served
                                </Button>
                              )}

                              {/* Add extra items button - available for non-billed, non-cancelled orders */}
                              {!['cancelled', 'billed'].includes(order.status) && (
                                <Button variant="outline" size="sm" className="w-full gap-1"
                                  onClick={() => startAddingToOrder(order)}
                                  disabled={addingToOrder?.id === order.id}
                                >
                                  <Plus className="h-3 w-3" /> Add Extra Items
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Quick Order Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" /> Quick Order Templates
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {templates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No templates available</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-2">
                {templates.map(template => {
                  const Icon = templateIcons[template.category] || Zap;
                  const itemCount = template.items?.length || 0;
                  const templateTotal = template.items?.reduce(
                    (sum, item) => sum + (item.service_item?.price || 0) * item.quantity, 0) || 0;
                  return (
                    <Card key={template.id} className="cursor-pointer transition-all hover:shadow-md hover:border-primary"
                      onClick={() => applyTemplate(template.id)}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="font-bold">{template.name}</div>
                            {template.description && <p className="text-sm text-muted-foreground line-clamp-1">{template.description}</p>}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary">{itemCount} items</Badge>
                              <Badge variant="outline">{formatCurrency(templateTotal)}</Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Room Selector Dialog */}
      <Dialog open={showRoomSelector} onOpenChange={setShowRoomSelector}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Select Room / Guest</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="grid grid-cols-2 gap-3 p-2">
              {activeBookings.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-muted-foreground">No checked-in guests</div>
              ) : (
                activeBookings.map(booking => (
                  <Card key={booking.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${selectedBooking?.id === booking.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => { setSelectedBooking(booking); setShowRoomSelector(false); }}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <BedDouble className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-lg">Room {booking.room?.room_number}</div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="h-3 w-3" /> {booking.guest?.first_name} {booking.guest?.last_name}
                          </div>
                          <Badge variant="secondary" className="mt-2">{booking.room?.room_type}</Badge>
                        </div>
                        {selectedBooking?.id === booking.id && <CheckCircle2 className="h-5 w-5 text-primary" />}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowRoomSelector(false)}>Cancel</Button>
            {selectedBooking && (
              <Button variant="destructive" onClick={() => { setSelectedBooking(null); setShowRoomSelector(false); }}>
                Clear Selection
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={(open) => { setShowPaymentDialog(open); if (!open) resetPaymentState(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Process Payment</span>
              <Button variant={isSplitMode ? "default" : "outline"} size="sm"
                onClick={() => { setIsSplitMode(!isSplitMode); setSplitPayments([]); setPaidAmount(""); }} className="gap-1">
                <SplitSquareHorizontal className="h-4 w-4" /> Split Payment
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">{isSplitMode ? 'Remaining Amount' : 'Amount Due'}</p>
              <p className="text-4xl font-bold text-primary">{formatCurrency(isSplitMode ? remainingAmount : total)}</p>
            </div>

            {isSplitMode && splitPayments.length > 0 && (
              <div className="space-y-2">
                <Label>Added Payments</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {splitPayments.map((payment, index) => (
                    <div key={index} className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                      <span className="capitalize">{payment.method.replace('_', ' ')}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeSplitPayment(index)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethodType)} className="grid grid-cols-4 gap-2">
                {paymentMethods.map(method => (
                  <Label key={method.id} htmlFor={method.id}
                    className={`flex flex-col items-center gap-1 p-3 border rounded-lg cursor-pointer transition-all ${paymentMethod === method.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
                    <RadioGroupItem value={method.id} id={method.id} className="sr-only" />
                    <method.icon className="h-5 w-5" />
                    <span className="text-xs">{method.label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            {(!isSplitMode || remainingAmount > 0) && (
              <div className="space-y-3">
                <Label>{isSplitMode ? 'Amount for this payment' : 'Amount Received'}</Label>
                <Input value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder={isSplitMode ? remainingAmount.toFixed(2) : total.toFixed(2)}
                  className="text-2xl text-center font-mono h-14" />
                <div className="grid grid-cols-4 gap-2">
                  {['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', 'C'].map(key => (
                    <Button key={key} variant={key === 'C' ? 'destructive' : 'outline'}
                      className="h-10 text-lg font-semibold" onClick={() => numpadClick(key)}>{key}</Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1"
                    onClick={() => setPaidAmount((isSplitMode ? remainingAmount : total).toFixed(2))}>Exact</Button>
                  {isSplitMode && (
                    <Button variant="outline" className="flex-1" onClick={addSplitPayment}
                      disabled={!paidAmount || parseFloat(paidAmount) <= 0}>
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  )}
                  {!isSplitMode && (
                    <Button variant="outline" className="flex-1"
                      onClick={() => setPaidAmount((Math.ceil(total / 100) * 100).toString())}>Round Up</Button>
                  )}
                </div>
              </div>
            )}

            {!isSplitMode && parseFloat(paidAmount) >= total && (
              <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <span className="font-medium text-foreground">Change</span>
                <span className="text-2xl font-bold text-green-600">{formatCurrency(change > 0 ? change : 0)}</span>
              </div>
            )}

            <Button className="w-full h-14 text-lg"
              disabled={isProcessing || (isSplitMode ? remainingAmount > 0.01 : parseFloat(paidAmount || '0') < total - 0.01)}
              onClick={handlePayment}>
              {isProcessing ? (
                <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Processing...</>
              ) : (
                <><CheckCircle2 className="h-5 w-5 mr-2" /> Complete Payment</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bill Orders Dialog */}
      <Dialog open={showBillDialog} onOpenChange={setShowBillDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Bill Selected Orders</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generate a combined invoice for {selectedOrderIds.length} order(s)?
            </p>
            {selectedBooking && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <BedDouble className="h-4 w-4" />
                <span>Charge to Room {selectedBooking.room?.room_number} - {selectedBooking.guest?.first_name}</span>
              </div>
            )}
            <div className="text-sm space-y-1">
              {selectedOrderIds.map(id => {
                const order = myOrders.find(o => o.id === id);
                return order ? (
                  <div key={id} className="flex justify-between">
                    <span>{order.order_number}</span>
                    <span className="font-medium">{formatCurrency(order.total_amount)}</span>
                  </div>
                ) : null;
              })}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary">
                  {formatCurrency(selectedOrderIds.reduce((sum, id) => {
                    const order = myOrders.find(o => o.id === id);
                    return sum + (order?.total_amount || 0);
                  }, 0))}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowBillDialog(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleBillOrders} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
                Generate Bill
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Print */}
      {receiptData && (
        <HotelReceiptPrint
          invoiceNumber={receiptData.invoiceNumber} items={receiptData.items}
          subtotal={receiptData.subtotal} discount={receiptData.discount}
          discountAmount={receiptData.discountAmount} taxRate={receiptData.taxRate}
          taxAmount={receiptData.taxAmount} total={receiptData.total}
          paymentMethod={receiptData.paymentMethod} splitPayments={receiptData.splitPayments}
          paidAmount={receiptData.paidAmount} changeAmount={receiptData.changeAmount}
          hotelInfo={hotelInfo || null} booking={receiptData.booking}
          isRoomCharge={receiptData.isRoomCharge} saleDate={new Date()}
          key={receiptData.invoiceNumber}
        />
      )}

      {/* KOT Print */}
      <KOTPrint data={currentKOT} onPrintComplete={handleKOTPrintComplete} />
    </Layout>
  );
}
