import { useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  UtensilsCrossed, 
  Coffee, 
  Wine, 
  Shirt, 
  Sparkles,
  Search,
  Package,
  Settings2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Link as LinkIcon,
  Unlink,
} from 'lucide-react';
import { 
  useServiceMenu, 
  useAddServiceMenuItem, 
  useUpdateServiceMenuItem, 
  useDeleteServiceMenuItem,
  useToggleServiceAvailability,
  ServiceMenuItem,
} from '@/hooks/useServiceMenu';
import {
  useServiceCategories,
  useAddServiceCategory,
  useUpdateServiceCategory,
  useDeleteServiceCategory,
  useToggleCategoryActive,
  ServiceCategory,
} from '@/hooks/useServiceCategories';
import { useAddHotelStockMovement, useHotelStockMovements } from '@/hooks/useHotelStock';
import { useProducts } from '@/hooks/useProducts';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'utensils-crossed': UtensilsCrossed,
  'coffee': Coffee,
  'wine': Wine,
  'shirt': Shirt,
  'sparkles': Sparkles,
  'package': Package,
};

const getIconComponent = (iconName: string) => {
  return iconMap[iconName] || Sparkles;
};

interface ServiceFormData {
  name: string;
  description: string;
  category: string;
  price: string;
  sort_order: string;
  is_available: boolean;
  track_stock: boolean;
  stock_quantity: string;
  min_stock_threshold: string;
  product_id: string;
}

const defaultFormData: ServiceFormData = {
  name: '',
  description: '',
  category: 'food',
  price: '',
  sort_order: '0',
  is_available: true,
  track_stock: false,
  stock_quantity: '0',
  min_stock_threshold: '5',
  product_id: '',
};

interface CategoryFormData {
  name: string;
  label: string;
  icon: string;
  sort_order: string;
}

const defaultCategoryForm: CategoryFormData = {
  name: '',
  label: '',
  icon: 'sparkles',
  sort_order: '0',
};

export default function HotelServiceMenu() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceMenuItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [stockItem, setStockItem] = useState<ServiceMenuItem | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>(defaultFormData);
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>(defaultCategoryForm);
  const [stockMovement, setStockMovement] = useState({ type: 'in' as 'in' | 'out', quantity: '', reason: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('items');

  const { data: menuItems = [], isLoading } = useServiceMenu();
  const { data: categories = [], isLoading: categoriesLoading } = useServiceCategories();
  const { data: stockMovements = [] } = useHotelStockMovements();
  const { products } = useProducts();
  const addItem = useAddServiceMenuItem();
  const updateItem = useUpdateServiceMenuItem();
  const deleteItem = useDeleteServiceMenuItem();
  const toggleAvailability = useToggleServiceAvailability();
  const addCategory = useAddServiceCategory();
  const updateCategory = useUpdateServiceCategory();
  const deleteCategory = useDeleteServiceCategory();
  const toggleCategoryActive = useToggleCategoryActive();
  const addStockMovement = useAddHotelStockMovement();

  const activeCategories = useMemo(() => 
    categories.filter(c => c.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [categories]
  );

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    return matchesSearch;
  });

  const lowStockItems = menuItems.filter(
    item => item.track_stock && item.stock_quantity <= item.min_stock_threshold
  );

  const handleOpenAdd = () => {
    setFormData({ ...defaultFormData, category: activeCategories[0]?.name || 'other' });
    setEditingItem(null);
    setIsAddDialogOpen(true);
  };

  const handleOpenEdit = (item: ServiceMenuItem) => {
    setFormData({
      name: item.name,
      description: item.description || '',
      category: item.category,
      price: item.price.toString(),
      sort_order: item.sort_order.toString(),
      is_available: item.is_available,
      track_stock: item.track_stock,
      stock_quantity: item.stock_quantity.toString(),
      min_stock_threshold: item.min_stock_threshold.toString(),
      product_id: item.product_id || '',
    });
    setEditingItem(item);
    setIsAddDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price) return;

    // If linked to a product, get stock from product
    const linkedProduct = formData.product_id ? products.find(p => p.id === formData.product_id) : null;

    const data = {
      name: formData.name,
      description: formData.description || null,
      category: formData.category,
      price: parseFloat(formData.price),
      sort_order: parseInt(formData.sort_order) || 0,
      is_available: formData.is_available,
      track_stock: formData.track_stock || !!linkedProduct,
      stock_quantity: linkedProduct ? linkedProduct.stock_quantity : parseInt(formData.stock_quantity) || 0,
      min_stock_threshold: linkedProduct ? (linkedProduct.min_stock_threshold || 5) : parseInt(formData.min_stock_threshold) || 5,
      product_id: formData.product_id || null,
    };

    if (editingItem) {
      await updateItem.mutateAsync({ id: editingItem.id, updates: data });
    } else {
      await addItem.mutateAsync(data);
    }

    setIsAddDialogOpen(false);
    setFormData(defaultFormData);
    setEditingItem(null);
  };

  const handleOpenCategoryAdd = () => {
    setCategoryForm(defaultCategoryForm);
    setEditingCategory(null);
    setIsCategoryDialogOpen(true);
  };

  const handleOpenCategoryEdit = (cat: ServiceCategory) => {
    setCategoryForm({
      name: cat.name,
      label: cat.label,
      icon: cat.icon,
      sort_order: cat.sort_order.toString(),
    });
    setEditingCategory(cat);
    setIsCategoryDialogOpen(true);
  };

  const handleCategorySubmit = async () => {
    if (!categoryForm.name || !categoryForm.label) return;

    const data = {
      name: categoryForm.name.toLowerCase().replace(/\s+/g, '-'),
      label: categoryForm.label,
      icon: categoryForm.icon,
      sort_order: parseInt(categoryForm.sort_order) || 0,
    };

    if (editingCategory) {
      await updateCategory.mutateAsync({ id: editingCategory.id, updates: data });
    } else {
      await addCategory.mutateAsync(data);
    }

    setIsCategoryDialogOpen(false);
    setCategoryForm(defaultCategoryForm);
    setEditingCategory(null);
  };

  const handleOpenStockDialog = (item: ServiceMenuItem) => {
    setStockItem(item);
    setStockMovement({ type: 'in', quantity: '', reason: '' });
    setIsStockDialogOpen(true);
  };

  const handleStockSubmit = async () => {
    if (!stockItem || !stockMovement.quantity || !stockMovement.reason) return;

    await addStockMovement.mutateAsync({
      service_item_id: stockItem.id,
      movement_type: stockMovement.type,
      quantity: parseInt(stockMovement.quantity),
      reason: stockMovement.reason,
    });

    setIsStockDialogOpen(false);
    setStockItem(null);
  };

  const groupedItems = useMemo(() => {
    const grouped: Record<string, ServiceMenuItem[]> = {};
    activeCategories.forEach(cat => {
      grouped[cat.name] = filteredItems.filter(item => item.category === cat.name);
    });
    return grouped;
  }, [activeCategories, filteredItems]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Service Menu</h1>
            <p className="text-muted-foreground">
              Manage services, categories, and stock
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleOpenCategoryAdd}>
              <Settings2 className="h-4 w-4 mr-2" />
              Add Category
            </Button>
            <Button onClick={handleOpenAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Low Stock Alert:</span>
                <span>{lowStockItems.map(i => i.name).join(', ')}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="items">Service Items</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="stock">Stock History</TabsTrigger>
          </TabsList>

          {/* Items Tab */}
          <TabsContent value="items" className="mt-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {isLoading ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Loading menu items...
                </CardContent>
              </Card>
            ) : filteredItems.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No items found. Add your first service item.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {activeCategories.map((cat) => {
                  const items = groupedItems[cat.name];
                  if (!items || items.length === 0) return null;
                  const IconComponent = getIconComponent(cat.icon);
                  
                  return (
                    <Card key={cat.name}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <IconComponent className="h-5 w-5" />
                          {cat.label}
                          <Badge variant="secondary" className="ml-2">
                            {items.length}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ServiceTable
                          items={items}
                          onEdit={handleOpenEdit}
                          onDelete={(id) => deleteItem.mutateAsync(id)}
                          onToggle={(id, val) => toggleAvailability.mutateAsync({ id, is_available: !val })}
                          onStock={handleOpenStockDialog}
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Service Categories</CardTitle>
              </CardHeader>
              <CardContent>
                {categoriesLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Icon</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Label</TableHead>
                        <TableHead className="text-center">Active</TableHead>
                        <TableHead className="text-center">System</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((cat) => {
                        const IconComponent = getIconComponent(cat.icon);
                        return (
                          <TableRow key={cat.id}>
                            <TableCell>
                              <IconComponent className="h-5 w-5" />
                            </TableCell>
                            <TableCell className="font-mono text-sm">{cat.name}</TableCell>
                            <TableCell className="font-medium">{cat.label}</TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={cat.is_active}
                                onCheckedChange={() => toggleCategoryActive.mutateAsync({ id: cat.id, is_active: !cat.is_active })}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              {cat.is_system && <Badge variant="outline">System</Badge>}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenCategoryEdit(cat)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                {!cat.is_system && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure? Items in this category will need to be reassigned.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteCategory.mutateAsync(cat.id)}>
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stock History Tab */}
          <TabsContent value="stock" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Stock Movement History</CardTitle>
              </CardHeader>
              <CardContent>
                {stockMovements.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No stock movements recorded</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockMovements.slice(0, 50).map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell className="text-muted-foreground">
                            {new Date(movement.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            {movement.service_item?.name || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={movement.movement_type === 'in' ? 'default' : movement.movement_type === 'out' ? 'destructive' : 'secondary'}>
                              {movement.movement_type === 'in' && <TrendingUp className="h-3 w-3 mr-1" />}
                              {movement.movement_type === 'out' && <TrendingDown className="h-3 w-3 mr-1" />}
                              {movement.movement_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {movement.movement_type === 'in' ? '+' : movement.movement_type === 'out' ? '-' : ''}
                            {movement.quantity}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{movement.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add/Edit Item Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Service Item' : 'Add Service Item'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Continental Breakfast"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCategories.map((cat) => (
                        <SelectItem key={cat.name} value={cat.name}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sort_order">Sort Order</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    min="0"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="is_available"
                    checked={formData.is_available}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                  />
                  <Label htmlFor="is_available">Available</Label>
                </div>
              </div>

              {/* Link to Main Inventory */}
              <div className="border-t pt-4 space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Link to Main Inventory (Optional)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Link this service item to a product in your main POS inventory for unified stock tracking.
                  </p>
                  <Select
                    value={formData.product_id}
                    onValueChange={(value) => {
                      const product = products.find(p => p.id === value);
                      setFormData({ 
                        ...formData, 
                        product_id: value === 'none' ? '' : value,
                        track_stock: value !== 'none' ? true : formData.track_stock,
                        stock_quantity: product ? product.stock_quantity.toString() : formData.stock_quantity,
                        min_stock_threshold: product ? (product.min_stock_threshold || 5).toString() : formData.min_stock_threshold,
                        price: product && !formData.price ? product.selling_price.toString() : formData.price,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product to link..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <div className="flex items-center gap-2">
                          <Unlink className="h-4 w-4" />
                          No link (standalone)
                        </div>
                      </SelectItem>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className="flex items-center justify-between gap-4">
                            <span>{product.name}</span>
                            <Badge variant="outline" className="ml-2">
                              Stock: {product.stock_quantity}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.product_id && (
                    <p className="text-xs text-primary flex items-center gap-1">
                      <LinkIcon className="h-3 w-3" />
                      Stock will sync with main inventory
                    </p>
                  )}
                </div>
              </div>

              {/* Stock Tracking Section */}
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="track_stock"
                    checked={formData.track_stock || !!formData.product_id}
                    onCheckedChange={(checked) => setFormData({ ...formData, track_stock: checked })}
                    disabled={!!formData.product_id}
                  />
                  <Label htmlFor="track_stock">Track Stock</Label>
                  {formData.product_id && (
                    <Badge variant="secondary" className="text-xs">Auto-enabled (linked)</Badge>
                  )}
                </div>
                {(formData.track_stock || formData.product_id) && !formData.product_id && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stock_quantity">Current Stock</Label>
                      <Input
                        id="stock_quantity"
                        type="number"
                        min="0"
                        value={formData.stock_quantity}
                        onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="min_stock_threshold">Min Threshold</Label>
                      <Input
                        id="min_stock_threshold"
                        type="number"
                        min="0"
                        value={formData.min_stock_threshold}
                        onChange={(e) => setFormData({ ...formData, min_stock_threshold: e.target.value })}
                      />
                    </div>
                  </div>
                )}
                {formData.product_id && (
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    <p className="text-muted-foreground">
                      Stock is managed through the linked product in main inventory.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button 
                onClick={handleSubmit} 
                disabled={addItem.isPending || updateItem.isPending}
              >
                {editingItem ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Category Dialog */}
        <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cat_label">Label *</Label>
                <Input
                  id="cat_label"
                  value={categoryForm.label}
                  onChange={(e) => setCategoryForm({ 
                    ...categoryForm, 
                    label: e.target.value,
                    name: e.target.value.toLowerCase().replace(/\s+/g, '-')
                  })}
                  placeholder="e.g., Pool Services"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat_icon">Icon</Label>
                <Select
                  value={categoryForm.icon}
                  onValueChange={(value) => setCategoryForm({ ...categoryForm, icon: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(iconMap).map(([key, Icon]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {key}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat_sort">Sort Order</Label>
                <Input
                  id="cat_sort"
                  type="number"
                  min="0"
                  value={categoryForm.sort_order}
                  onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleCategorySubmit} disabled={addCategory.isPending || updateCategory.isPending}>
                {editingCategory ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stock Movement Dialog */}
        <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Stock: {stockItem?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Current Stock</p>
                <p className="text-3xl font-bold">{stockItem?.stock_quantity || 0}</p>
              </div>
              <div className="space-y-2">
                <Label>Movement Type</Label>
                <Select
                  value={stockMovement.type}
                  onValueChange={(value: 'in' | 'out') => setStockMovement({ ...stockMovement, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        Stock In
                      </div>
                    </SelectItem>
                    <SelectItem value="out">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-500" />
                        Stock Out
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock_qty">Quantity</Label>
                <Input
                  id="stock_qty"
                  type="number"
                  min="1"
                  value={stockMovement.quantity}
                  onChange={(e) => setStockMovement({ ...stockMovement, quantity: e.target.value })}
                  placeholder="Enter quantity"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock_reason">Reason</Label>
                <Input
                  id="stock_reason"
                  value={stockMovement.reason}
                  onChange={(e) => setStockMovement({ ...stockMovement, reason: e.target.value })}
                  placeholder="e.g., Restock, Damage, Consumed"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleStockSubmit} disabled={addStockMovement.isPending}>
                {stockMovement.type === 'in' ? 'Add Stock' : 'Remove Stock'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

interface ServiceTableProps {
  items: ServiceMenuItem[];
  onEdit: (item: ServiceMenuItem) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, currentValue: boolean) => void;
  onStock: (item: ServiceMenuItem) => void;
}

function ServiceTable({ items, onEdit, onDelete, onToggle, onStock }: ServiceTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-center">Stock</TableHead>
          <TableHead className="text-center">Available</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <span className="font-medium">{item.name}</span>
                {item.product_id && (
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <LinkIcon className="h-3 w-3" />
                    Linked
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground max-w-xs truncate">
              {item.description || '-'}
            </TableCell>
            <TableCell className="text-right font-mono">
              ${item.price.toFixed(2)}
            </TableCell>
            <TableCell className="text-center">
              {item.track_stock ? (
                <Badge 
                  variant={item.stock_quantity <= item.min_stock_threshold ? 'destructive' : 'secondary'}
                  className="cursor-pointer"
                  onClick={() => !item.product_id && onStock(item)}
                  title={item.product_id ? 'Managed via linked product' : 'Click to adjust stock'}
                >
                  {item.stock_quantity}
                  {item.product_id && <LinkIcon className="h-3 w-3 ml-1" />}
                </Badge>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell className="text-center">
              <Switch
                checked={item.is_available}
                onCheckedChange={() => onToggle(item.id, item.is_available)}
              />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                {item.track_stock && !item.product_id && (
                  <Button variant="ghost" size="icon" onClick={() => onStock(item)} title="Adjust stock">
                    <Package className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Item</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{item.name}"?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(item.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
