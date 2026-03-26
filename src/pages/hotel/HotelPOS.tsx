import { useState, useMemo, useEffect, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { useAvailableServices } from "@/hooks/useServiceMenu";
import { useActiveServiceCategories } from "@/hooks/useServiceCategories";
import { useHotelBookings, useHotelInfo } from "@/hooks/useHotel";
import { useHotelPOS, HotelPOSPayment, HotelCartItem } from "@/hooks/useHotelPOS";
import { useOrderTemplates } from "@/hooks/useOrderTemplates";
import { usePlaceOrder, useWaiterOrders, useBillOrders, useUpdateOrderStatus, useAddItemsToOrder, useHotelOrdersRealtime, HotelOrder } from "@/hooks/useHotelOrders";
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

const orderStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  pending: { label: "Pending", variant: "destructive", color: "bg-amber-500" },
  preparing: { label: "Preparing", variant: "default", color: "bg-blue-500" },
  ready: { label: "Ready", variant: "secondary", color: "bg-emerald-500" },
  served: { label: "Served", variant: "outline", color: "bg-slate-400" },
  cancelled: { label: "Cancelled", variant: "destructive", color: "bg-red-500" },
  billed: { label: "Billed", variant: "outline", color: "bg-slate-300" },
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
  useHotelOrdersRealtime();

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
  const [mobileView, setMobileView] = useState<"menu" | "cart">("menu");
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [tableNumber, setTableNumber] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [showBillDialog, setShowBillDialog] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [addingToOrder, setAddingToOrder] = useState<HotelOrder | null>(null);

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

  const [notifiedReady, setNotifiedReady] = useState<Set<string>>(new Set());
  const prevOrdersRef = useRef<HotelOrder[]>([]);

  useEffect(() => {
    const readyOrders = myOrders.filter(o => o.status === 'ready' && !notifiedReady.has(o.id));
    if (readyOrders.length > 0) {
      readyOrders.forEach(o => {
        const prevOrder = prevOrdersRef.current.find(po => po.id === o.id);
        const wasNotReady = !prevOrder || prevOrder.status !== 'ready';
        if (wasNotReady) {
          toast.success(`🔔 Order ${o.order_number} is READY!`, {
            description: o.room ? `Room ${o.room.room_number}` : o.table_number ? `Table ${o.table_number}` : 'Walk-in',
            duration: 15000,
          });
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(`Order ${o.order_number} is READY!`, {
              body: o.room ? `Room ${o.room.room_number}` : o.table_number ? `Table ${o.table_number}` : 'Walk-in order',
              icon: '/favicon.ico',
              tag: `order-ready-${o.id}`,
            });
          }
        }
      });
      setNotifiedReady(prev => {
        const next = new Set(prev);
        readyOrders.forEach(o => next.add(o.id));
        return next;
      });
    }
    prevOrdersRef.current = myOrders;
  }, [myOrders]);

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

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

  useEffect(() => {
    if (kotQueue.length > 0 && !currentKOT) {
      setCurrentKOT(kotQueue[0]);
      setKotQueue(prev => prev.slice(1));
    }
  }, [kotQueue, currentKOT]);

  const handleKOTPrintComplete = () => {
    setCurrentKOT(null);
  };

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
        staffId: activeStaff?.staff_id || null,
        shiftId: activeShift?.id || null,
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

      const waiterName = activeStaff ? `${activeStaff.first_name} ${activeStaff.last_name}` : undefined;
      const roomNumber = selectedBooking?.room?.room_number || null;
      const stationItems: Record<string, Array<{ name: string; quantity: number; notes?: string | null }>> = {};
      for (const item of cart) {
        const station = getStationForCategory(item.service.category);
        const stationKey = station === 'other' ? 'kitchen' : station;
        if (!stationItems[stationKey]) stationItems[stationKey] = [];
        stationItems[stationKey].push({ name: item.service.name, quantity: item.quantity, notes: itemNotes[item.service.id] || null });
      }
      const kots = Object.entries(stationItems).map(([station, items]) => ({
        orderNumber: order.order_number, station: station as 'kitchen' | 'bar',
        tableNumber: tableNumber || null, roomNumber, waiterName, items,
        orderNotes: orderNotes || undefined, timestamp: new Date(),
      }));
      setKotQueue(kots);
      clearCart(); setItemNotes({}); setOrderNotes(""); setTableNumber(""); setRightTab("orders");
    } catch { } finally { setIsProcessing(false); }
  };

  const handleAddItemsToOrder = async () => {
    if (!addingToOrder || cart.length === 0) return;
    if (!waiterId) { toast.error("Staff not logged in"); return; }
    if (addingToOrder.waiter_id !== waiterId) { toast.error("You can only add items to your own orders"); return; }
    setIsProcessing(true);
    try {
      await addItemsToOrder.mutateAsync({
        orderId: addingToOrder.id, orderNumber: addingToOrder.order_number, taxRate,
        shiftId: activeShift?.id || null,
        items: cart.map(item => ({
          serviceItemId: item.service.id, name: item.service.name, quantity: item.quantity,
          unitPrice: item.unit_price, notes: itemNotes[item.service.id] || undefined, category: item.service.category,
        })),
      });
      const waiterName = activeStaff ? `${activeStaff.first_name} ${activeStaff.last_name}` : undefined;
      const roomNumber = addingToOrder.room?.room_number || null;
      const stationItems: Record<string, Array<{ name: string; quantity: number; notes?: string | null }>> = {};
      for (const item of cart) {
        const station = getStationForCategory(item.service.category);
        const stationKey = station === 'other' ? 'kitchen' : station;
        if (!stationItems[stationKey]) stationItems[stationKey] = [];
        stationItems[stationKey].push({ name: item.service.name, quantity: item.quantity, notes: itemNotes[item.service.id] || null });
      }
      const kots = Object.entries(stationItems).map(([station, items]) => ({
        orderNumber: `${addingToOrder.order_number} (EXTRA)`, station: station as 'kitchen' | 'bar',
        tableNumber: addingToOrder.table_number || null, roomNumber, waiterName, items,
        orderNotes: orderNotes || undefined, timestamp: new Date(),
      }));
      setKotQueue(kots);
      clearCart(); setItemNotes({}); setOrderNotes(""); setAddingToOrder(null); setRightTab("orders");
    } catch { } finally { setIsProcessing(false); }
  };

  const startAddingToOrder = (order: HotelOrder) => {
    if (order.waiter_id !== waiterId) { toast.error("You can only add items to your own orders"); return; }
    clearCart(); setItemNotes({}); setOrderNotes(""); setAddingToOrder(order);
    if (order.table_number) setTableNumber(order.table_number);
    if (order.booking_id && order.room_id) {
      const booking = activeBookings.find(b => b.id === order.booking_id);
      if (booking) setSelectedBooking(booking);
    }
    setRightTab("cart"); setMobileView("menu");
    toast.info(`Adding items to ${order.order_number}`);
  };

  const cancelAddingToOrder = () => {
    setAddingToOrder(null); clearCart(); setItemNotes({}); setOrderNotes("");
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
      paymentsToProcess = splitPayments; paidAmt = splitPayments.reduce((sum, p) => sum + p.amount, 0);
    } else {
      const amount = parseFloat(paidAmount) || total;
      if (amount < total - 0.01) { toast.error("Insufficient payment"); return; }
      paymentsToProcess = [{ method: paymentMethod, amount }]; paidAmt = amount;
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
      setShowPaymentDialog(false); resetPaymentState();
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

  const handleBillOrders = async () => {
    if (selectedOrderIds.length === 0) { toast.error("Select orders to bill"); return; }
    setIsProcessing(true);
    try {
      await billOrders.mutateAsync({
        orderIds: selectedOrderIds, bookingId: selectedBooking?.id,
        guestId: selectedBooking?.guest_id, paymentMethod: 'cash',
        paymentStatus: selectedBooking ? 'pending' : 'paid',
        staffId: activeStaff?.staff_id || null,
        shiftId: activeShift?.id || null,
      });
      setSelectedOrderIds([]); setShowBillDialog(false);
    } catch { } finally { setIsProcessing(false); }
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

  // ─── RENDER ─────────────────────────────────────────────
  return (
    <Layout>
      <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
        {/* ─── Compact Top Bar ─── */}
        <div className="bg-card border-b border-border px-3 py-2 flex items-center gap-2 flex-wrap">
          {/* Left: Title + Context */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Receipt className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-sm font-bold text-foreground hidden sm:block">Hotel POS</h1>
          </div>

          {/* Center: Table + Room */}
          <div className="flex items-center gap-2 flex-1 justify-center">
            <Input
              placeholder="Table #"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-20 h-8 text-xs"
            />
            <Button
              variant={selectedBooking ? "default" : "outline"}
              size="sm"
              className="gap-1.5 h-8 text-xs"
              onClick={() => setShowRoomSelector(true)}
            >
              <BedDouble className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {selectedBooking ? `Room ${selectedBooking.room?.room_number}` : 'Select Room'}
              </span>
              {selectedBooking && <span className="sm:hidden">{selectedBooking.room?.room_number}</span>}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)} className="gap-1 h-8 text-xs hidden md:flex">
              <Zap className="h-3.5 w-3.5" /> Templates
            </Button>
          </div>

          {/* Right: Shortcuts */}
          <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-muted-foreground shrink-0">
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono">F2</kbd>Search
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono">F7</kbd>Order
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono">F8</kbd>Pay
          </div>

          {/* Mobile: Toggle views */}
          <div className="flex md:hidden items-center gap-1 ml-auto">
            <Button
              variant={mobileView === "menu" ? "default" : "outline"} size="sm" className="h-8 text-xs"
              onClick={() => setMobileView("menu")}
            >
              <Utensils className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={mobileView === "cart" ? "default" : "outline"} size="sm" className="h-8 text-xs relative"
              onClick={() => setMobileView("cart")}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* ─── Main Content ─── */}
        <div className="flex-1 flex overflow-hidden">
          {/* ─── LEFT: Menu Items ─── */}
          <div className={`flex-1 flex flex-col bg-background ${mobileView === 'cart' ? 'hidden md:flex' : 'flex'}`}>
            {/* Search */}
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input ref={searchInputRef} placeholder="Search items..." value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 h-8 text-xs" />
              </div>
            </div>

            {/* Categories - horizontal scroll */}
            <div className="border-b border-border px-2 py-1.5">
              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveCategory("all")}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeCategory === "all"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted hover:bg-accent text-foreground"
                  }`}
                >
                  All
                </button>
                {categories.map(cat => {
                  const Icon = categoryIcons[cat.name] || ShoppingBag;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.name)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                        activeCategory === cat.name
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted hover:bg-accent text-foreground"
                      }`}
                    >
                      <Icon className="h-3 w-3" />{cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Items Grid */}
            <ScrollArea className="flex-1">
              <div className="p-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
                {filteredServices.map(service => {
                  const isLowStock = service.track_stock && service.stock_quantity <= service.min_stock_threshold;
                  const isOutOfStock = service.track_stock && service.stock_quantity <= 0;
                  const cartItem = cart.find(item => item.service.id === service.id);
                  return (
                    <div
                      key={service.id}
                      onClick={() => !isOutOfStock && addToCart(service)}
                      className={`
                        relative rounded-xl border border-border bg-card p-2.5 cursor-pointer
                        transition-all duration-150 hover:shadow-md hover:-translate-y-0.5
                        ${isOutOfStock ? 'opacity-40 cursor-not-allowed' : ''}
                        ${cartItem ? 'ring-2 ring-primary border-primary shadow-md shadow-primary/10' : 'hover:border-primary/40'}
                      `}
                    >
                      {/* Quantity badge */}
                      {cartItem && (
                        <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-sm">
                          {cartItem.quantity}
                        </div>
                      )}
                      {isOutOfStock && (
                        <div className="absolute top-1 right-1">
                          <Badge variant="destructive" className="text-[9px] px-1 py-0">Out</Badge>
                        </div>
                      )}
                      <p className="font-medium text-xs leading-tight line-clamp-2 mb-1.5">{service.name}</p>
                      <div className="flex items-end justify-between">
                        <span className="text-sm font-bold text-primary">{formatCurrency(service.price)}</span>
                        {service.track_stock && !isOutOfStock && (
                          <span className={`text-[9px] px-1 py-0.5 rounded ${isLowStock ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                            {service.stock_quantity}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredServices.length === 0 && (
                  <div className="col-span-full text-center py-16 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No items found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* ─── RIGHT: Cart & Orders ─── */}
          <div className={`w-full md:w-[360px] lg:w-[400px] border-l border-border bg-card flex flex-col ${mobileView === 'menu' ? 'hidden md:flex' : 'flex'}`}>
            <Tabs value={rightTab} onValueChange={(v) => setRightTab(v as any)} className="flex flex-col h-full">
              <TabsList className="w-full rounded-none border-b border-border h-9 bg-transparent p-0">
                <TabsTrigger value="cart" className="flex-1 gap-1 text-xs rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full">
                  <Receipt className="h-3.5 w-3.5" /> Cart
                  {cart.length > 0 && (
                    <span className="ml-1 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                      {cart.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="orders" className="flex-1 gap-1 text-xs rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full relative">
                  <ClipboardList className="h-3.5 w-3.5" /> Orders
                  {readyCount > 0 && (
                    <span className="ml-1 h-4 min-w-[16px] px-1 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center animate-pulse">
                      {readyCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* ─── Cart Tab ─── */}
              <TabsContent value="cart" className="flex-1 flex flex-col m-0 overflow-hidden">
                {/* Cart Header */}
                <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs">
                      {addingToOrder ? `→ ${addingToOrder.order_number}` : 'New Order'}
                    </span>
                    {addingToOrder && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 border-primary text-primary animate-pulse">
                        EXTRA
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {addingToOrder && (
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={cancelAddingToOrder}>
                        <X className="h-3 w-3 mr-0.5" /> Cancel
                      </Button>
                    )}
                    {lastReceiptData && !addingToOrder && (
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={handleReprintReceipt}>
                        <Printer className="h-3 w-3" />
                      </Button>
                    )}
                    {cart.length > 0 && (
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-destructive hover:text-destructive"
                        onClick={() => { clearCart(); setItemNotes({}); setOrderNotes(""); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Cart Items */}
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1.5">
                    {cart.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground">
                        <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-15" />
                        <p className="text-xs font-medium">Empty cart</p>
                        <p className="text-[10px] mt-0.5">Tap items to add</p>
                      </div>
                    ) : (
                      <>
                        {cart.map(item => (
                          <div key={item.service.id} className="rounded-lg bg-muted/40 p-2 space-y-1.5">
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-xs leading-tight truncate">{item.service.name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {formatCurrency(item.unit_price)} × {item.quantity} = <span className="font-semibold text-foreground">{formatCurrency(item.quantity * item.unit_price)}</span>
                                </p>
                              </div>
                              <div className="flex items-center gap-0.5">
                                <Button variant="outline" size="icon" className="h-6 w-6 rounded-md"
                                  onClick={() => updateQuantity(item.service.id, item.quantity - 1)}>
                                  <Minus className="h-2.5 w-2.5" />
                                </Button>
                                <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                                <Button variant="outline" size="icon" className="h-6 w-6 rounded-md"
                                  onClick={() => updateQuantity(item.service.id, item.quantity + 1)}>
                                  <Plus className="h-2.5 w-2.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                                  onClick={() => removeFromCart(item.service.id)}>
                                  <Trash2 className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            </div>
                            <Input
                              placeholder="Notes (no onions, extra spicy...)"
                              value={itemNotes[item.service.id] || ""}
                              onChange={(e) => setItemNotes(prev => ({ ...prev, [item.service.id]: e.target.value }))}
                              className="h-6 text-[10px] bg-background"
                            />
                          </div>
                        ))}
                        <div className="pt-1">
                          <Textarea
                            placeholder="Order notes..."
                            value={orderNotes}
                            onChange={(e) => setOrderNotes(e.target.value)}
                            className="text-[10px] min-h-[32px] bg-background"
                            rows={1}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>

                {/* Cart Summary & Actions */}
                {cart.length > 0 && (
                  <div className="border-t border-border p-2.5 space-y-2 bg-card">
                    {/* Totals */}
                    <div className="space-y-0.5 text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>Discount ({discount}%)</span>
                          <span>-{formatCurrency(discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-muted-foreground">
                        <span>GST ({taxRate}%)</span>
                        <span>{formatCurrency(taxAmount)}</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex justify-between text-base font-bold">
                        <span>Total</span>
                        <span className="text-primary">{formatCurrency(total)}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {addingToOrder ? (
                      <Button className="w-full h-10" disabled={cart.length === 0 || isProcessing} onClick={handleAddItemsToOrder}>
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                        Add to {addingToOrder.order_number}
                      </Button>
                    ) : (
                      <>
                        <Button className="w-full h-10 text-sm font-semibold" disabled={cart.length === 0 || isProcessing || !waiterId} onClick={handlePlaceOrder}>
                          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                          Place Order
                        </Button>
                        <div className="grid grid-cols-2 gap-1.5">
                          <Button variant="outline" size="sm" className="h-8 text-[10px]"
                            disabled={cart.length === 0 || !selectedBooking || isProcessing}
                            onClick={handleChargeToRoom}>
                            <BedDouble className="h-3 w-3 mr-1" /> Room Charge
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-[10px]"
                            disabled={cart.length === 0 || isProcessing}
                            onClick={() => setShowPaymentDialog(true)}>
                            <CreditCard className="h-3 w-3 mr-1" /> Direct Pay
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* ─── My Orders Tab ─── */}
              <TabsContent value="orders" className="flex-1 flex flex-col m-0 overflow-hidden">
                <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                  <span className="font-semibold text-xs">My Orders</span>
                  <Button variant="default" size="sm" className="h-7 text-[10px]"
                    disabled={selectedOrderIds.length === 0}
                    onClick={() => setShowBillDialog(true)}>
                    <FileText className="h-3 w-3 mr-1" />
                    Bill ({selectedOrderIds.length})
                  </Button>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-2">
                    {myOrders.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground">
                        <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-15" />
                        <p className="text-xs font-medium">No orders yet</p>
                      </div>
                    ) : (
                      myOrders.filter(o => !o.is_billed).map(order => {
                        const config = orderStatusConfig[order.status] || orderStatusConfig.pending;
                        const isSelected = selectedOrderIds.includes(order.id);
                        const canBill = order.status === 'served' || order.status === 'ready';
                        return (
                          <div
                            key={order.id}
                            className={`
                              rounded-xl border bg-card overflow-hidden transition-all
                              ${isSelected ? 'ring-2 ring-primary' : ''}
                              ${order.status === 'ready' ? 'border-emerald-400 shadow-sm shadow-emerald-500/10' : 'border-border'}
                            `}
                          >
                            {/* Status strip */}
                            <div className={`h-1 ${config.color}`} />
                            <div className="p-2.5 space-y-2">
                              {/* Header */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {canBill && (
                                    <input type="checkbox" checked={isSelected}
                                      onChange={() => toggleOrderSelection(order.id)}
                                      className="h-3.5 w-3.5 rounded border-border accent-primary" />
                                  )}
                                  <span className="font-bold text-xs">{order.order_number}</span>
                                </div>
                                <Badge variant={config.variant} className="text-[10px] h-5">{config.label}</Badge>
                              </div>

                              {/* Meta */}
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                                {order.room && (
                                  <span className="flex items-center gap-0.5">
                                    <BedDouble className="h-3 w-3" /> {order.room.room_number}
                                  </span>
                                )}
                                {order.table_number && <span>T-{order.table_number}</span>}
                                <span className="flex items-center gap-0.5">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                                </span>
                              </div>

                              {/* Items */}
                              <div className="space-y-0.5">
                                {order.items?.map(item => (
                                  <div key={item.id} className="flex justify-between text-[10px]">
                                    <span className="text-muted-foreground">
                                      {item.quantity}× {item.name}
                                      {item.notes && (
                                        <span className="text-amber-500 ml-0.5">• {item.notes}</span>
                                      )}
                                    </span>
                                    <span className="font-medium">{formatCurrency(item.total_price)}</span>
                                  </div>
                                ))}
                              </div>

                              <Separator />

                              <div className="flex justify-between items-center">
                                <span className="font-bold text-xs">Total</span>
                                <span className="font-bold text-sm text-primary">{formatCurrency(order.total_amount)}</span>
                              </div>

                              {/* Ready alert */}
                              {order.status === 'ready' && (
                                <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 p-2 rounded-lg text-xs font-medium">
                                  <Bell className="h-3.5 w-3.5 animate-bounce" />
                                  Ready! Serve to guest.
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex gap-1.5">
                                {order.status === 'ready' && (
                                  <Button variant="default" size="sm" className="flex-1 h-7 text-[10px]"
                                    onClick={() => updateOrderStatus.mutate({ orderId: order.id, status: 'served' })}>
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Served
                                  </Button>
                                )}
                                {!['cancelled', 'billed'].includes(order.status) && (
                                  <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px]"
                                    onClick={() => startAddingToOrder(order)}
                                    disabled={addingToOrder?.id === order.id}>
                                    <Plus className="h-3 w-3 mr-1" /> Add Items
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
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

      {/* ─── DIALOGS ─── */}

      {/* Quick Order Templates */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4" /> Quick Order Templates
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {templates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs">No templates available</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 p-1">
                {templates.map(template => {
                  const Icon = templateIcons[template.category] || Zap;
                  const itemCount = template.items?.length || 0;
                  const templateTotal = template.items?.reduce(
                    (sum, item) => sum + (item.service_item?.price || 0) * item.quantity, 0) || 0;
                  return (
                    <div key={template.id}
                      className="cursor-pointer rounded-xl border border-border p-3 hover:border-primary hover:shadow-sm transition-all"
                      onClick={() => applyTemplate(template.id)}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="font-semibold text-xs">{template.name}</div>
                      </div>
                      <div className="flex gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">{itemCount} items</Badge>
                        <Badge variant="outline" className="text-[10px]">{formatCurrency(templateTotal)}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Room Selector */}
      <Dialog open={showRoomSelector} onOpenChange={setShowRoomSelector}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="text-sm">Select Room / Guest</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="grid grid-cols-2 gap-2 p-1">
              {activeBookings.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-muted-foreground text-xs">No checked-in guests</div>
              ) : (
                activeBookings.map(booking => (
                  <div key={booking.id}
                    className={`cursor-pointer rounded-xl border p-3 transition-all hover:shadow-sm ${selectedBooking?.id === booking.id ? 'ring-2 ring-primary border-primary' : 'border-border hover:border-primary/40'}`}
                    onClick={() => { setSelectedBooking(booking); setShowRoomSelector(false); }}>
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BedDouble className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-bold text-sm">Room {booking.room?.room_number}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <User className="h-3 w-3" /> {booking.guest?.first_name} {booking.guest?.last_name}
                        </div>
                      </div>
                      {selectedBooking?.id === booking.id && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowRoomSelector(false)}>Cancel</Button>
            {selectedBooking && (
              <Button variant="destructive" size="sm" onClick={() => { setSelectedBooking(null); setShowRoomSelector(false); }}>
                Clear
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={(open) => { setShowPaymentDialog(open); if (!open) resetPaymentState(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-sm">
              <span>Payment</span>
              <Button variant={isSplitMode ? "default" : "outline"} size="sm" className="h-7 text-[10px]"
                onClick={() => { setIsSplitMode(!isSplitMode); setSplitPayments([]); setPaidAmount(""); }}>
                <SplitSquareHorizontal className="h-3 w-3 mr-1" /> Split
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Amount display */}
            <div className="text-center py-3 bg-muted rounded-xl">
              <p className="text-[10px] text-muted-foreground mb-0.5">{isSplitMode ? 'Remaining' : 'Amount Due'}</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(isSplitMode ? remainingAmount : total)}</p>
            </div>

            {isSplitMode && splitPayments.length > 0 && (
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {splitPayments.map((payment, index) => (
                  <div key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded-lg text-xs">
                    <span className="capitalize">{payment.method.replace('_', ' ')}</span>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeSplitPayment(index)}>
                        <X className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Payment methods */}
            <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethodType)} className="grid grid-cols-4 gap-1.5">
              {paymentMethods.map(method => (
                <Label key={method.id} htmlFor={`pm-${method.id}`}
                  className={`flex flex-col items-center gap-0.5 p-2 border rounded-xl cursor-pointer transition-all text-xs ${
                    paymentMethod === method.id ? 'border-primary bg-primary/5 shadow-sm' : 'hover:bg-muted border-border'
                  }`}>
                  <RadioGroupItem value={method.id} id={`pm-${method.id}`} className="sr-only" />
                  <method.icon className="h-4 w-4" />
                  <span className="text-[10px]">{method.label}</span>
                </Label>
              ))}
            </RadioGroup>

            {(!isSplitMode || remainingAmount > 0) && (
              <div className="space-y-2">
                <Input value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder={isSplitMode ? remainingAmount.toFixed(2) : total.toFixed(2)}
                  className="text-xl text-center font-mono h-12" />
                <div className="grid grid-cols-4 gap-1">
                  {['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', 'C'].map(key => (
                    <Button key={key} variant={key === 'C' ? 'destructive' : 'outline'}
                      className="h-9 text-sm font-semibold" onClick={() => numpadClick(key)}>{key}</Button>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="flex-1 h-8"
                    onClick={() => setPaidAmount((isSplitMode ? remainingAmount : total).toFixed(2))}>Exact</Button>
                  {isSplitMode ? (
                    <Button variant="outline" size="sm" className="flex-1 h-8" onClick={addSplitPayment}
                      disabled={!paidAmount || parseFloat(paidAmount) <= 0}>
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="flex-1 h-8"
                      onClick={() => setPaidAmount((Math.ceil(total / 100) * 100).toString())}>Round Up</Button>
                  )}
                </div>
              </div>
            )}

            {!isSplitMode && parseFloat(paidAmount) >= total && (
              <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <span className="font-medium text-xs">Change</span>
                <span className="text-xl font-bold text-emerald-600">{formatCurrency(change > 0 ? change : 0)}</span>
              </div>
            )}

            <Button className="w-full h-12 text-sm font-semibold"
              disabled={isProcessing || (isSplitMode ? remainingAmount > 0.01 : parseFloat(paidAmount || '0') < total - 0.01)}
              onClick={handlePayment}>
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Complete Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bill Orders Dialog */}
      <Dialog open={showBillDialog} onOpenChange={setShowBillDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Bill Orders</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {selectedBooking && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg text-xs">
                <BedDouble className="h-3.5 w-3.5" />
                Room {selectedBooking.room?.room_number} - {selectedBooking.guest?.first_name}
              </div>
            )}
            <div className="space-y-1 text-xs">
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
              <div className="flex justify-between font-bold text-sm">
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
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowBillDialog(false)}>Cancel</Button>
              <Button size="sm" className="flex-1" onClick={handleBillOrders} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <FileText className="h-3.5 w-3.5 mr-1" />}
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
