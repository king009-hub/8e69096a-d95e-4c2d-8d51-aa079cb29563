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
import { Search, Plus, Minus, ShoppingCart, Trash2, Printer, Receipt, Edit2, User, Phone, Monitor } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ReceiptPrint } from "@/components/pos/ReceiptPrint";
import { CustomerDisplay } from "@/components/pos/CustomerDisplay";

export function PointOfSale() {
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
            body { font-family: Arial, sans-serif; margin: 20px; }
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
            body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; width: 300px; }
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Point of Sale</h1>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowCustomerDisplay(!showCustomerDisplay)}
              className="flex items-center gap-2"
            >
              <Monitor className="h-4 w-4" />
              {showCustomerDisplay ? "Hide" : "Show"} Customer Display
            </Button>
            <Badge variant="outline" className="text-lg px-4 py-2">
              <ShoppingCart className="h-4 w-4 mr-2" />
              {cart.length} items
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Products</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products by name or barcode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="border border-border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => addToCart(product.id)}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                            {product.image_url ? (
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling!.className = 'flex items-center justify-center w-full h-full text-muted-foreground text-xs';
                                }}
                              />
                            ) : (
                              <span className="text-muted-foreground text-xs">No Image</span>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-foreground truncate">{product.name}</h3>
                            <Badge variant={getProductStock(product.id) > 0 ? "secondary" : "destructive"} className="ml-2 flex-shrink-0">
                              {getProductStock(product.id)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-primary">
                              {formatCurrency(product.selling_price)}
                            </span>
                            <Button size="sm" disabled={getProductStock(product.id) <= 0}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cart */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cart</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Cart is empty</p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                     {cart.map((item) => (
                       <div key={item.product.id} className="flex items-center justify-between p-3 border border-border rounded">
                         <div className="flex-1">
                           <h4 className="font-medium text-foreground">{item.product.name}</h4>
                           <div className="flex items-center gap-2">
                             {editingPrice === item.product.id ? (
                               <div className="flex items-center gap-1">
                                 <Input
                                   type="number"
                                   value={tempPrice}
                                   onChange={(e) => setTempPrice(Number(e.target.value))}
                                   className="w-20 h-6 text-xs"
                                   step="0.01"
                                   min="0"
                                 />
                                 <Button
                                   size="sm"
                                   onClick={() => updatePrice(item.product.id, tempPrice)}
                                   className="h-6 px-2"
                                 >
                                   ✓
                                 </Button>
                                 <Button
                                   size="sm"
                                   variant="outline"
                                   onClick={() => setEditingPrice(null)}
                                   className="h-6 px-2"
                                 >
                                   ✕
                                 </Button>
                               </div>
                             ) : (
                               <div className="flex items-center gap-1">
                                  <span className="text-sm text-muted-foreground">
                                    {formatCurrency(item.unit_price)} each
                                  </span>
                                 <Button
                                   size="sm"
                                   variant="ghost"
                                   onClick={() => startEditingPrice(item.product.id, item.unit_price)}
                                   className="h-6 w-6 p-0"
                                 >
                                   <Edit2 className="h-3 w-3" />
                                 </Button>
                               </div>
                             )}
                           </div>
                         </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {cart.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="customer-name" className="text-sm font-medium">
                      Customer Name
                    </Label>
                    <Input
                      id="customer-name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter customer name (for receipt)"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer-phone" className="text-sm font-medium flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Phone Number
                    </Label>
                    <Input
                      id="customer-phone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Enter phone number"
                      type="tel"
                      className="mt-1"
                    />
                  </div>
                   <div>
                     <Label htmlFor="discount">Discount (%)</Label>
                     <Input
                       id="discount"
                       type="number"
                       min="0"
                       max="100"
                       value={discount}
                       onChange={(e) => setDiscount(Number(e.target.value))}
                       placeholder="0"
                     />
                   </div>
                   <div>
                     <Label htmlFor="payment-method">Payment Method</Label>
                     <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                       <SelectTrigger>
                         <SelectValue placeholder="Select payment method" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="cash">Cash</SelectItem>
                         <SelectItem value="card">Card</SelectItem>
                         <SelectItem value="momo">Mobile Money</SelectItem>
                         <SelectItem value="credit">Credit Sale</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                </CardContent>
              </Card>
            )}

            {cart.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                     <div className="flex justify-between">
                       <span>Subtotal:</span>
                       <span>{formatCurrency(subtotal)}</span>
                     </div>
                     <div className="flex justify-between">
                       <span>Discount:</span>
                       <span>-{formatCurrency(discountAmount)}</span>
                     </div>
                     <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
                       <span>Total:</span>
                       <span>{formatCurrency(total)}</span>
                     </div>
                  </div>
                   <div className="space-y-2 mt-4">
                     <Button 
                       className="w-full" 
                       onClick={handleCompleteSale}
                       size="lg"
                     >
                       Complete Sale
                     </Button>
                     
                     {lastSale && (
                       <div className="flex gap-2">
                         <Button 
                           variant="outline" 
                           onClick={printInvoice}
                           className="flex-1"
                         >
                           <Printer className="h-4 w-4 mr-2" />
                           Print Invoice
                         </Button>
                         <Button 
                           variant="outline" 
                           onClick={printReceipt}
                           className="flex-1"
                         >
                           <Receipt className="h-4 w-4 mr-2" />
                           Print Receipt
                         </Button>
                       </div>
                     )}
                   </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Customer Display Modal/Overlay */}
        {showCustomerDisplay && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-background rounded-lg shadow-2xl w-full max-w-4xl h-5/6 relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 z-10"
                onClick={() => setShowCustomerDisplay(false)}
              >
                ✕
              </Button>
              <CustomerDisplay
                cart={cart}
                subtotal={subtotal}
                discountAmount={discountAmount}
                total={total}
                customerName={customerName}
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default PointOfSale;