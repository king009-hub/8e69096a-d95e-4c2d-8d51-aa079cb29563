import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useProducts } from "@/hooks/useProducts";
import { useSales } from "@/hooks/useSales";
import { useCustomers } from "@/hooks/useCustomers";
import { useProductBatches } from "@/hooks/useProductBatches";
import { useBatchStock } from "@/hooks/useBatchStock";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { CartItem } from "@/types/inventory";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Search, Plus, Minus, Trash2, Monitor, Package, Printer, CreditCard, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ReceiptPrint } from "@/components/pos/ReceiptPrint";
import { CustomerDisplay } from "@/components/pos/CustomerDisplay";
import { CreateLoanDialog } from "@/components/loans/CreateLoanDialog";

export default function PointOfSale() {
  const { formatCurrency, posSettings, getCurrencySymbol } = useSettingsContext();
  const { products } = useProducts();
  const { createSale } = useSales();
  const { findOrCreateCustomer } = useCustomers();
  const { getBatchesForSale } = useProductBatches();
  const { getProductStock } = useBatchStock();
  const { toast } = useToast();
  
  // Helper function for printing (to avoid double currency symbols)
  const printCurrency = (amount: number) => {
    return `${getCurrencySymbol()}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState(posSettings.default_payment_method);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState(0);
  const [lastSale, setLastSale] = useState<any>(null);
  const [showCustomerDisplay, setShowCustomerDisplay] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [paidAmount, setPaidAmount] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [tinNumber, setTinNumber] = useState("");
  const [receiptPhone, setReceiptPhone] = useState("");

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) {
      toast({
        title: "Error",
        description: "Product not found",
        variant: "destructive",
      });
      return;
    }

    const existingItem = cart.find(item => item.product.id === productId);
    const newQuantity = existingItem ? existingItem.quantity + 1 : 1;
    
    // Check batch availability using FEFO logic
    const { canFulfill } = getBatchesForSale(productId, newQuantity);
    if (!canFulfill) {
      toast({
        title: "Error",
        description: "Insufficient stock in batches",
        variant: "destructive",
      });
      return;
    }

    if (existingItem) {
      updateQuantity(productId, newQuantity);
      setSelectedProduct({...existingItem, quantity: newQuantity});
    } else {
      const newItem = {
        product,
        quantity: 1,
        unit_price: product.selling_price
      };
      setCart(prev => [...prev, newItem]);
      setSelectedProduct(newItem);
    }
  };

  const selectCartItem = (item: CartItem) => {
    setSelectedProduct(item);
  };

  const updateSelectedProduct = (updates: Partial<CartItem>) => {
    if (!selectedProduct) return;
    
    const updatedItem = { ...selectedProduct, ...updates };
    setSelectedProduct(updatedItem);
    
    if (updates.quantity !== undefined) {
      if (updates.quantity <= 0) {
        removeFromCart(selectedProduct.product.id);
        setSelectedProduct(null);
      } else {
        updateQuantity(selectedProduct.product.id, updates.quantity);
      }
    } else if (updates.unit_price !== undefined) {
      updatePrice(selectedProduct.product.id, updates.unit_price);
    }
  };

  const handleNumpadClick = (value: string) => {
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

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    // Check batch availability using FEFO logic
    const { canFulfill } = getBatchesForSale(productId, quantity);
    if (!canFulfill) {
      toast({
        title: "Error",
        description: "Cannot exceed available stock in batches",
        variant: "destructive",
      });
      return;
    }

    setCart(prev => prev.map(item =>
      item.product.id === productId
        ? { ...item, quantity }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updatePrice = (productId: string, newPrice: number) => {
    setCart(prev => prev.map(item =>
      item.product.id === productId
        ? { ...item, unit_price: newPrice }
        : item
    ));
    setEditingPrice(null);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const discountAmount = (subtotal * discount) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = posSettings.enable_tax ? (taxableAmount * (posSettings.tax_rate || 0)) / 100 : 0;
  const total = taxableAmount + taxAmount;

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "Cart is empty",
        variant: "destructive",
      });
      return;
    }

    setShowPaymentDialog(false);

    try {
      let customerId;
      
      // Create or find customer if name is provided
      if (customerName.trim()) {
        const customer = await findOrCreateCustomer(customerName.trim(), customerPhone.trim() || undefined);
        customerId = customer.id;
      }

      const saleData = {
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        total_amount: subtotal,
        discount: discountAmount,
        tax_amount: taxAmount,
        final_amount: total,
        payment_method: paymentMethod,
        sale_date: new Date().toISOString(),
        notes: undefined
      };

      // Pass the cart items directly - they already match CartItem interface
      const sale = await createSale(saleData, cart, customerId);
      setLastSale({ ...sale, customer_name: customerName, customer_phone: customerPhone });

      toast({
        title: "Success",
        description: `Sale ${sale.sale_number} completed successfully`,
      });

      // Auto-print receipt after successful sale
      setTimeout(() => {
        const receiptPrint = ReceiptPrint({
          saleNumber: sale.sale_number,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          items: cart,
          subtotal,
          discount: discountAmount,
          taxAmount,
          taxName: posSettings.tax_name || "Tax",
          total,
          paymentMethod,
          saleDate: sale.sale_date
        });
        receiptPrint.printReceipt();
      }, 5);

      // Clear the cart and customer info after a brief delay
      setTimeout(() => {
        setCart([]);
        setCustomerName("");
        setCustomerPhone("");
        setDiscount(0);
        setPaymentMethod(posSettings.default_payment_method);
        setSelectedProduct(null);
        setPaidAmount("");
        setTinNumber("");
        setReceiptPhone("");
      }, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete sale",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="h-[calc(100vh-40px)] bg-background overflow-hidden">
        {/* Compact Header with Total and Complete Sale */}
        <div className="flex items-center justify-between px-3 py-1 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <div className="text-xl font-bold text-primary">
              Total: {formatCurrency(total)}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogTrigger asChild>
                  <Button
                    disabled={cart.length === 0}
                    className="h-10 px-6 bg-success hover:bg-success/90 text-success-foreground font-semibold"
                  >
                    Complete Sale
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Complete Payment
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(total)}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Payment Method</Label>
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="mt-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cash" id="cash" />
                        <Label htmlFor="cash">Cash</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="momo" id="momo" />
                        <Label htmlFor="momo">Mobile Money</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="airtel" id="airtel" />
                        <Label htmlFor="airtel">Airtel Money</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="card" id="card" />
                        <Label htmlFor="card">Card</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="loan" id="loan" />
                        <Label htmlFor="loan">Loan Payment</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Amount Input with Keypad */}
                  <div>
                    <Label className="text-sm font-medium">Amount Paid</Label>
                    <Input 
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder="0.00"
                      className="h-10 text-lg font-mono text-center"
                      readOnly
                    />
                    
                    {/* Numeric Keypad */}
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "C"].map((key) => (
                        <Button
                          key={key}
                          variant="outline"
                          className="h-12 text-lg font-semibold"
                          onClick={() => handleNumpadClick(key)}
                        >
                          {key}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">TIN Number</Label>
                      <Input 
                        value={tinNumber}
                        onChange={(e) => setTinNumber(e.target.value)}
                        placeholder="Optional"
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Receipt Phone</Label>
                      <Input 
                        value={receiptPhone}
                        onChange={(e) => setReceiptPhone(e.target.value)}
                        placeholder="Optional"
                        className="h-8"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleCompleteSale}
                      className="flex-1 bg-success hover:bg-success/90"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Pay & Print
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowPaymentDialog(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <CreateLoanDialog>
              <Button 
                className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                disabled={cart.length === 0}
              >
                Create Loan
              </Button>
            </CreateLoanDialog>
            
            <Button
              variant="outline"
              onClick={() => setShowCustomerDisplay(!showCustomerDisplay)}
              size="sm"
            >
              <Monitor className="h-4 w-4 mr-2" />
              Display
            </Button>
            </div>
          </div>
        </div>

        {/* Main Content - Full Width */}
        <div className="h-[calc(100%-40px)]">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Expanded Left Panel - Cart Items */}
            <ResizablePanel defaultSize={60} minSize={50} maxSize={70}>
              <div className="h-full bg-card border-r border-border flex flex-col">
                <div className="p-3 border-b border-border">
                  <h3 className="font-semibold text-sm">Cart Items</h3>
                </div>
                
                {/* Cart Items List - One Column Layout */}
                <div className="flex-1 overflow-auto p-3">
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-muted/50"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{item.product.name}</h4>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-3">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="h-6 w-6 p-0"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span 
                            className="text-sm font-medium cursor-pointer min-w-[30px] text-center"
                            onClick={() => addToCart(item.product.id)}
                          >
                            {item.quantity}
                          </span>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="h-6 w-6 p-0"
                            onClick={() => addToCart(item.product.id)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="text-sm font-medium ml-3 min-w-[80px] text-right">
                          {formatCurrency(item.unit_price)}
                        </div>
                        
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-6 w-6 p-0 ml-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {cart.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">Cart is empty</p>
                    )}
                  </div>
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Right Panel - Products Grid */}
            <ResizablePanel defaultSize={40} minSize={30} maxSize={50}>
                <div className="h-full bg-background">
                  {/* Search */}
                  <div className="p-4 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-9"
                      />
                    </div>
                  </div>

                  {/* Products Grid - Compact - 7 cards per column */}
                  <div className="p-2 h-[calc(100%-60px)] overflow-auto">
                    <div className="grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                      {filteredProducts.map((product) => {
                        const stock = getProductStock(product.id);
                        const inCart = cart.find(item => item.product.id === product.id);
                        
                        return (
                          <Card
                            key={product.id}
                            className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 ${
                              inCart ? 'ring-2 ring-primary bg-primary/5' : ''
                            }`}
                            onClick={() => addToCart(product.id)}
                          >
                            <CardContent className="p-2">
                              <div className="text-center">
                                <div className="w-8 h-8 bg-muted/50 rounded-md mb-1 mx-auto flex items-center justify-center">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <h3 className="font-medium text-[10px] truncate mb-1 leading-tight" title={product.name}>
                                  {product.name}
                                </h3>
                                <div className="text-[9px] text-muted-foreground mb-1">
                                  Stock: {stock}
                                </div>
                                <div className="font-bold text-[11px] text-primary">
                                  {formatCurrency(product.selling_price)}
                                </div>
                                {inCart && (
                                  <Badge variant="secondary" className="mt-1 text-[8px] px-1 py-0">
                                    {inCart.quantity} in cart
                                  </Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
        </div>

        {/* Customer Display Modal */}
        {showCustomerDisplay && (
          <CustomerDisplay
            cart={cart}
            subtotal={subtotal}
            discountAmount={discountAmount}
            total={total}
            customerName={customerName}
          />
        )}
      </div>
    </Layout>
  );
}