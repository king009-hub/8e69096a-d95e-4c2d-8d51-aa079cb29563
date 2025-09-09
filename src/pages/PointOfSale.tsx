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
import { Search, Plus, Minus, Trash2, Monitor, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ReceiptPrint } from "@/components/pos/ReceiptPrint";
import { CustomerDisplay } from "@/components/pos/CustomerDisplay";

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
            <div className="text-sm text-muted-foreground">
              {cart.length} items • Subtotal: {formatCurrency(subtotal)}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleCompleteSale}
              disabled={cart.length === 0}
              className="h-10 px-6 bg-success hover:bg-success/90 text-success-foreground font-semibold"
            >
              Complete Sale
            </Button>
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

        {/* Main Content - 70% width container */}
        <div className="h-[calc(100%-40px)] flex justify-center">
          <div className="w-[70%] h-full">
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* Left Sidebar - Selected Item & Keypad */}
              <ResizablePanel defaultSize={30} minSize={25} maxSize={35}>
                <div className="h-full bg-card border-r border-border flex flex-col">
                  {/* Selected Product Editor */}
                  <div className="p-4 border-b border-border">
                    <h3 className="font-semibold text-base mb-3">Selected Item</h3>
                    {selectedProduct ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <h4 className="font-medium text-sm">{selectedProduct.product.name}</h4>
                          <p className="text-xs text-muted-foreground">{selectedProduct.product.barcode}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Qty</Label>
                            <div className="flex items-center gap-1">
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-7 w-7 p-0"
                                onClick={() => updateSelectedProduct({ quantity: selectedProduct.quantity - 1 })}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input 
                                value={selectedProduct.quantity}
                                onChange={(e) => updateSelectedProduct({ quantity: parseInt(e.target.value) || 0 })}
                                className="h-7 text-center text-xs"
                              />
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-7 w-7 p-0"
                                onClick={() => updateSelectedProduct({ quantity: selectedProduct.quantity + 1 })}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Price</Label>
                            <Input 
                              value={selectedProduct.unit_price}
                              onChange={(e) => updateSelectedProduct({ unit_price: parseFloat(e.target.value) || 0 })}
                              className="h-7 text-xs"
                            />
                          </div>
                        </div>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="w-full h-7 text-xs"
                          onClick={() => {
                            removeFromCart(selectedProduct.product.id);
                            setSelectedProduct(null);
                          }}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Select a product to edit</p>
                    )}
                  </div>

                  {/* Cart Items - Compact */}
                  <div className="flex-1 overflow-auto p-4">
                    <div className="space-y-2">
                      {cart.map((item) => (
                        <div
                          key={item.product.id}
                          onClick={() => selectCartItem(item)}
                          className={`p-2 rounded cursor-pointer border text-xs ${
                            selectedProduct?.product.id === item.product.id 
                              ? 'bg-primary/10 border-primary' 
                              : 'bg-background border-border hover:bg-muted/50'
                          }`}
                        >
                          <div className="font-medium truncate">{item.product.name}</div>
                          <div className="text-muted-foreground">
                            {item.quantity} x {formatCurrency(item.unit_price)} = {formatCurrency(item.quantity * item.unit_price)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Numeric Keypad */}
                  <div className="p-4 border-t border-border">
                    <div className="mb-3">
                      <Label className="text-xs">Amount Paid</Label>
                      <Input 
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        placeholder="0.00"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", ".", "C"].map((num) => (
                        <Button
                          key={num}
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => handleNumpadClick(num)}
                        >
                          {num}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Customer Info - Compact */}
                  <div className="p-4 border-t border-border">
                    <div className="space-y-2">
                      <Input
                        placeholder="Customer name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Input
                        placeholder="Phone number"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Right Panel - Products Grid */}
              <ResizablePanel defaultSize={70} minSize={65}>
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