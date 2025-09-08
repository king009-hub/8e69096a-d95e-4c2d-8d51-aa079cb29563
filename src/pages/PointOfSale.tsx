import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useProducts } from "@/hooks/useProducts";
import { useSales } from "@/hooks/useSales";
import { useCustomers } from "@/hooks/useCustomers";
import { useProductBatches } from "@/hooks/useProductBatches";
import { useBatchStock } from "@/hooks/useBatchStock";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { CartItem } from "@/types/inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Search, Plus, Minus, ShoppingCart, Trash2, Printer, Receipt, Edit2, User, Phone, Monitor, CreditCard, Banknote, Calculator, Package } from "lucide-react";
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
    } else {
      setCart(prev => [...prev, {
        product,
        quantity: 1,
        unit_price: product.selling_price
      }]);
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

  const startEditingPrice = (productId: string, currentPrice: number) => {
    setEditingPrice(productId);
    setTempPrice(currentPrice);
  };

  const printInvoice = () => {
    if (!lastSale) return;
    
    const printWindow = window.open('', '_blank');
    const invoice = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${lastSale.sale_number}</title>
          <style>
            body { font-family: Inter, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .invoice-details { margin-bottom: 20px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .items-table th { background-color: #f2f2f2; }
            .totals { text-align: right; margin-top: 20px; }
            .total-line { margin: 5px 0; }
            .final-total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>INVOICE</h1>
            <h2>Your Store Name</h2>
            <p>Your Store Address</p>
          </div>
          
          <div class="invoice-details">
            <p><strong>Invoice Number:</strong> ${lastSale.sale_number}</p>
            <p><strong>Date:</strong> ${new Date(lastSale.sale_date).toLocaleDateString()}</p>
            <p><strong>Customer:</strong> ${lastSale.customer_name || 'Walk-in Customer'}</p>
            ${lastSale.customer_phone ? `<p><strong>Phone:</strong> ${lastSale.customer_phone}</p>` : ''}
            <p><strong>Payment Method:</strong> ${lastSale.payment_method.toUpperCase()}</p>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${cart.map(item => `
                <tr>
                  <td>${item.product.name}</td>
                  <td>${item.quantity}</td>
                  <td>${printCurrency(item.unit_price)}</td>
                  <td>${printCurrency(item.quantity * item.unit_price)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-line">Subtotal: ${printCurrency(subtotal)}</div>
            <div class="total-line">Discount: -${printCurrency(discountAmount)}</div>
            <div class="total-line final-total">Total: ${printCurrency(total)}</div>
          </div>

          <div style="margin-top: 40px; text-align: center;">
            <p>Thank you for your business!</p>
          </div>
        </body>
      </html>
    `;
    
    printWindow?.document.write(invoice);
    printWindow?.document.close();
    printWindow?.print();
  };

  const printReceipt = () => {
    if (!lastSale) return;
    
    const printWindow = window.open('', '_blank');
    const receipt = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${lastSale.sale_number}</title>
          <style>
            body { font-family: Inter, monospace; font-size: 12px; margin: 0; padding: 10px; width: 300px; }
            .center { text-align: center; }
            .line { border-bottom: 1px dashed #000; margin: 5px 0; }
            .item-row { display: flex; justify-content: space-between; margin: 2px 0; }
            .bold { font-weight: bold; }
            .right { text-align: right; }
          </style>
        </head>
        <body>
          <div class="center bold">
            YOUR STORE NAME<br>
            Store Address<br>
            Tel: (123) 456-7890
          </div>
          <div class="line"></div>
          
          <div>Receipt #: ${lastSale.sale_number}</div>
          <div>Date: ${new Date(lastSale.sale_date).toLocaleDateString()}</div>
          <div>Time: ${new Date(lastSale.sale_date).toLocaleTimeString()}</div>
          <div>Cashier: Admin</div>
          ${lastSale.customer_name ? `<div>Customer: ${lastSale.customer_name}</div>` : ''}
          
          <div class="line"></div>
          
          ${cart.map(item => `
            <div class="item-row">
              <span>${item.product.name}</span>
            </div>
            <div class="item-row">
              <span>${item.quantity} x ${printCurrency(item.unit_price)}</span>
              <span>${printCurrency(item.quantity * item.unit_price)}</span>
            </div>
          `).join('')}
          
          <div class="line"></div>
          
          <div class="item-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(subtotal).replace('$', '')}</span>
          </div>
          <div class="item-row">
            <span>Discount:</span>
            <span>-${formatCurrency(discountAmount).replace('$', '')}</span>
          </div>
          <div class="item-row bold">
            <span>TOTAL:</span>
            <span>${formatCurrency(total).replace('$', '')}</span>
          </div>
          <div class="item-row">
            <span>Payment (${lastSale.payment_method.toUpperCase()}):</span>
            <span>${formatCurrency(total).replace('$', '')}</span>
          </div>
          
          <div class="line"></div>
          <div class="center">
            Thank you for your purchase!<br>
            Please come again
          </div>
        </body>
      </html>
    `;
    
    printWindow?.document.write(receipt);
    printWindow?.document.close();
    printWindow?.print();
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
      <div className="h-screen bg-gradient-to-br from-background via-background to-accent/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50 bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Calculator className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Point of Sale</h1>
              <p className="text-sm text-muted-foreground font-medium">Modern retail management system</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setShowCustomerDisplay(!showCustomerDisplay)}
              className="flex items-center gap-2 h-12 px-6 rounded-xl border-2 hover:border-primary/30 transition-all duration-200"
            >
              <Monitor className="h-5 w-5" />
              {showCustomerDisplay ? "Hide" : "Show"} Display
            </Button>
            <div className="flex items-center gap-3 px-6 py-3 rounded-xl bg-primary/10 border border-primary/20">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold text-primary">{cart.length} items</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="h-[calc(100vh-120px)]">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Left Sidebar - Cart */}
            <ResizablePanel defaultSize={35} minSize={30} maxSize={45}>
              <div className="h-full bg-card border-r border-border/50 flex flex-col">
                {/* Cart Header */}
                <div className="p-6 border-b border-border/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-success/10 border border-success/20">
                      <ShoppingCart className="h-6 w-6 text-success" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">Shopping Cart</h2>
                  </div>
                  
                  {/* Customer Section */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="customer-name" className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Customer Name
                        </Label>
                        <Input
                          id="customer-name"
                          placeholder="Enter customer name"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="h-12 rounded-xl border-2 focus:border-primary/50 transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customer-phone" className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Phone Number
                        </Label>
                        <Input
                          id="customer-phone"
                          placeholder="Enter phone number"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="h-12 rounded-xl border-2 focus:border-primary/50 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-auto p-6">
                  {cart.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="p-6 rounded-2xl bg-muted/30 border border-muted/50 inline-block">
                        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg font-medium text-muted-foreground">Cart is empty</p>
                        <p className="text-sm text-muted-foreground mt-1">Add products to start selling</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cart.map((item) => (
                        <div key={item.product.id} className="p-4 rounded-2xl border border-border/50 bg-background/50 hover:bg-accent/20 transition-all duration-200">
                          <div className="flex gap-4">
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted/50 flex items-center justify-center border border-border/30">
                              {item.product.image_url ? (
                                <img 
                                  src={item.product.image_url} 
                                  alt={item.product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-foreground text-lg truncate">{item.product.name}</h3>
                              <div className="flex items-center gap-3 mt-2">
                                <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                    className="h-8 w-8 p-0 rounded-md hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <span className="font-bold text-foreground min-w-[2rem] text-center text-lg">
                                    {item.quantity}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                    className="h-8 w-8 p-0 rounded-md hover:bg-success/10 hover:text-success"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                                
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeFromCart(item.product.id)}
                                  className="h-8 w-8 p-0 rounded-md hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <div className="flex items-center justify-between mt-3">
                                {editingPrice === item.product.id ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      value={tempPrice}
                                      onChange={(e) => setTempPrice(parseFloat(e.target.value) || 0)}
                                      className="w-24 h-8 text-sm rounded-lg"
                                      step="0.01"
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => updatePrice(item.product.id, tempPrice)}
                                      className="h-8 px-3 rounded-lg"
                                    >
                                      Save
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startEditingPrice(item.product.id, item.unit_price)}
                                    className="flex items-center gap-2 h-8 px-3 rounded-lg hover:bg-primary/10"
                                  >
                                    <span className="font-bold text-lg text-primary">
                                      {formatCurrency(item.unit_price)}
                                    </span>
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                )}
                                
                                <span className="font-bold text-xl text-foreground">
                                  {formatCurrency(item.quantity * item.unit_price)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cart Summary & Checkout */}
                {cart.length > 0 && (
                  <div className="p-6 border-t border-border/50 bg-accent/10">
                    {/* Discount & Payment */}
                    <div className="space-y-4 mb-6">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-foreground">Discount %</Label>
                          <Input
                            type="number"
                            value={discount}
                            onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                            className="h-12 rounded-xl border-2 focus:border-primary/50"
                            placeholder="0"
                            min="0"
                            max="100"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Payment
                          </Label>
                          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger className="h-12 rounded-xl border-2 focus:border-primary/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">
                                <div className="flex items-center gap-2">
                                  <Banknote className="h-4 w-4" />
                                  Cash
                                </div>
                              </SelectItem>
                              <SelectItem value="card">
                                <div className="flex items-center gap-2">
                                  <CreditCard className="h-4 w-4" />
                                  Card
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between items-center py-2 border-b border-border/30">
                        <span className="font-medium text-muted-foreground">Subtotal</span>
                        <span className="font-bold text-lg text-foreground">{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-border/30">
                        <span className="font-medium text-muted-foreground">Discount</span>
                        <span className="font-bold text-lg text-destructive">-{formatCurrency(discountAmount)}</span>
                      </div>
                      {posSettings.enable_tax && (
                        <div className="flex justify-between items-center py-2 border-b border-border/30">
                          <span className="font-medium text-muted-foreground">{posSettings.tax_name || "Tax"}</span>
                          <span className="font-bold text-lg text-foreground">{formatCurrency(taxAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-3 border-t-2 border-primary/20">
                        <span className="font-bold text-xl text-foreground">Total</span>
                        <span className="font-bold text-2xl text-primary">{formatCurrency(total)}</span>
                      </div>
                    </div>

                    {/* Checkout Buttons */}
                    <div className="space-y-3">
                      <Button
                        onClick={handleCompleteSale}
                        className="w-full h-14 text-lg font-bold rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-lg"
                      >
                        Complete Sale
                      </Button>
                      
                      {lastSale && (
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            variant="outline"
                            onClick={printReceipt}
                            className="h-12 rounded-xl border-2 hover:border-primary/30 transition-all duration-200"
                          >
                            <Receipt className="h-4 w-4 mr-2" />
                            Receipt
                          </Button>
                          <Button
                            variant="outline"
                            onClick={printInvoice}
                            className="h-12 rounded-xl border-2 hover:border-primary/30 transition-all duration-200"
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Invoice
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Right Panel - Products */}
            <ResizablePanel defaultSize={65} minSize={55}>
              <div className="h-full bg-background/50 flex flex-col">
                {/* Products Header */}
                <div className="p-6 border-b border-border/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-info/10 border border-info/20">
                      <Package className="h-6 w-6 text-info" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">Product Catalog</h2>
                  </div>
                  
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Search products by name or barcode..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 h-14 text-lg rounded-2xl border-2 focus:border-primary/50 transition-colors bg-card"
                    />
                  </div>
                </div>

                {/* Products Grid */}
                <div className="flex-1 overflow-auto p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className="group relative rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card hover:border-primary/30 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden"
                        onClick={() => addToCart(product.id)}
                      >
                        {/* Product Image */}
                        <div className="aspect-square p-4">
                          <div className="w-full h-full rounded-xl overflow-hidden bg-muted/30 flex items-center justify-center border border-border/30">
                            {product.image_url ? (
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <Package className="h-12 w-12 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Product Info */}
                        <div className="p-4 pt-0">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-bold text-foreground text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                              {product.name}
                            </h3>
                            <Badge 
                              variant={getProductStock(product.id) > 0 ? "secondary" : "destructive"} 
                              className="ml-2 flex-shrink-0 font-bold"
                            >
                              {getProductStock(product.id)}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {product.description}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-primary">
                              {formatCurrency(product.selling_price)}
                            </span>
                            <Button 
                              size="sm" 
                              disabled={getProductStock(product.id) <= 0}
                              className="rounded-xl h-10 w-10 p-0 shadow-lg hover:shadow-xl transition-all duration-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product.id);
                              }}
                            >
                              <Plus className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>

                        {/* Hover Effect */}
                        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      </div>
                    ))}
                  </div>

                  {filteredProducts.length === 0 && (
                    <div className="text-center py-12">
                      <div className="p-6 rounded-2xl bg-muted/30 border border-muted/50 inline-block">
                        <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg font-medium text-muted-foreground">No products found</p>
                        <p className="text-sm text-muted-foreground mt-1">Try adjusting your search terms</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Customer Display Modal */}
        <Dialog open={showCustomerDisplay} onOpenChange={setShowCustomerDisplay}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Customer Display</DialogTitle>
            </DialogHeader>
                            <CustomerDisplay
                              cart={cart}
                              subtotal={subtotal}
                              discountAmount={discountAmount}
                              total={total}
                              customerName={customerName}
                            />
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}