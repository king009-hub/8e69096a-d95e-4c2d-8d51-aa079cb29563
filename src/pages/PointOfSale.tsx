import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useProducts } from "@/hooks/useProducts";
import { useSales } from "@/hooks/useSales";
import { CartItem } from "@/types/inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Minus, ShoppingCart, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export function PointOfSale() {
  const { products } = useProducts();
  const { createSale } = useSales();
  const { toast } = useToast();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discount, setDiscount] = useState(0);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock_quantity <= 0) {
      toast({
        title: "Error",
        description: "Product is out of stock",
        variant: "destructive",
      });
      return;
    }

    const existingItem = cart.find(item => item.product.id === productId);
    if (existingItem) {
      if (existingItem.quantity >= product.stock_quantity) {
        toast({
          title: "Error",
          description: "Cannot add more than available stock",
          variant: "destructive",
        });
        return;
      }
      updateQuantity(productId, existingItem.quantity + 1);
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

    const product = products.find(p => p.id === productId);
    if (product && quantity > product.stock_quantity) {
      toast({
        title: "Error",
        description: "Cannot exceed available stock",
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

  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;

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
      const saleData = {
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        total_amount: subtotal,
        discount: discountAmount,
        final_amount: total,
        payment_method: 'cash',
        sale_date: new Date().toISOString(),
        notes: undefined
      };

      const items = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price
      }));

      await createSale(saleData, items);

      // Clear the cart and customer info
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setDiscount(0);

      toast({
        title: "Success",
        description: "Sale completed successfully",
      });
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
          <Badge variant="outline" className="text-lg px-4 py-2">
            <ShoppingCart className="h-4 w-4 mr-2" />
            {cart.length} items
          </Badge>
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
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-foreground">{product.name}</h3>
                        <Badge variant={product.stock_quantity > 0 ? "secondary" : "destructive"}>
                          {product.stock_quantity} in stock
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-primary">
                          ${product.selling_price.toFixed(2)}
                        </span>
                        <Button size="sm" disabled={product.stock_quantity <= 0}>
                          <Plus className="h-4 w-4" />
                        </Button>
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
                          <p className="text-sm text-muted-foreground">
                            ${item.unit_price.toFixed(2)} each
                          </p>
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
                  <CardTitle>Customer Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="customer-name">Customer Name</Label>
                    <Input
                      id="customer-name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer-phone">Phone Number</Label>
                    <Input
                      id="customer-phone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Optional"
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
                </CardContent>
              </Card>
            )}

            {cart.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discount:</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
                      <span>Total:</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button 
                    className="w-full mt-4" 
                    onClick={handleCompleteSale}
                    size="lg"
                  >
                    Complete Sale
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default PointOfSale;