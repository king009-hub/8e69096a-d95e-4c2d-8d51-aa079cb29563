import { useState } from 'react';
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
} from 'lucide-react';
import { 
  useServiceMenu, 
  useAddServiceMenuItem, 
  useUpdateServiceMenuItem, 
  useDeleteServiceMenuItem,
  useToggleServiceAvailability,
  ServiceMenuItem,
  ServiceMenuInsert,
} from '@/hooks/useServiceMenu';

const categories = [
  { value: 'food', label: 'Food', icon: UtensilsCrossed },
  { value: 'beverages', label: 'Beverages', icon: Coffee },
  { value: 'minibar', label: 'Minibar', icon: Wine },
  { value: 'laundry', label: 'Laundry', icon: Shirt },
  { value: 'other', label: 'Other Services', icon: Sparkles },
];

const getCategoryIcon = (category: string) => {
  const cat = categories.find(c => c.value === category);
  return cat?.icon || Sparkles;
};

const getCategoryLabel = (category: string) => {
  const cat = categories.find(c => c.value === category);
  return cat?.label || category;
};

interface ServiceFormData {
  name: string;
  description: string;
  category: string;
  price: string;
  sort_order: string;
  is_available: boolean;
}

const defaultFormData: ServiceFormData = {
  name: '',
  description: '',
  category: 'food',
  price: '',
  sort_order: '0',
  is_available: true,
};

export default function HotelServiceMenu() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceMenuItem | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>(defaultFormData);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const { data: menuItems = [], isLoading } = useServiceMenu();
  const addItem = useAddServiceMenuItem();
  const updateItem = useUpdateServiceMenuItem();
  const deleteItem = useDeleteServiceMenuItem();
  const toggleAvailability = useToggleServiceAvailability();

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesCategory = activeTab === 'all' || item.category === activeTab;
    return matchesSearch && matchesCategory;
  });

  const handleOpenAdd = () => {
    setFormData(defaultFormData);
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
    });
    setEditingItem(item);
    setIsAddDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price) {
      return;
    }

    const data: ServiceMenuInsert = {
      name: formData.name,
      description: formData.description || null,
      category: formData.category,
      price: parseFloat(formData.price),
      sort_order: parseInt(formData.sort_order) || 0,
      is_available: formData.is_available,
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

  const handleDelete = async (id: string) => {
    await deleteItem.mutateAsync(id);
  };

  const handleToggleAvailability = async (id: string, currentValue: boolean) => {
    await toggleAvailability.mutateAsync({ id, is_available: !currentValue });
  };

  const groupedItems = categories.reduce((acc, cat) => {
    acc[cat.value] = filteredItems.filter(item => item.category === cat.value);
    return acc;
  }, {} as Record<string, ServiceMenuItem[]>);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Service Menu</h1>
            <p className="text-muted-foreground">
              Manage food, beverages, and room service items
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Edit Service Item' : 'Add Service Item'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
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
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
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
                      placeholder="0"
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
        </div>

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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Items</TabsTrigger>
            {categories.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value}>
                <cat.icon className="h-4 w-4 mr-1" />
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-4">
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
                {categories.map((cat) => {
                  const items = groupedItems[cat.value];
                  if (!items || items.length === 0) return null;
                  
                  return (
                    <Card key={cat.value}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <cat.icon className="h-5 w-5" />
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
                          onDelete={handleDelete}
                          onToggle={handleToggleAvailability}
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {categories.map((cat) => (
            <TabsContent key={cat.value} value={cat.value} className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <cat.icon className="h-5 w-5" />
                    {cat.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {groupedItems[cat.value]?.length ? (
                    <ServiceTable
                      items={groupedItems[cat.value]}
                      onEdit={handleOpenEdit}
                      onDelete={handleDelete}
                      onToggle={handleToggleAvailability}
                    />
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      No items in this category
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
}

interface ServiceTableProps {
  items: ServiceMenuItem[];
  onEdit: (item: ServiceMenuItem) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, currentValue: boolean) => void;
}

function ServiceTable({ items, onEdit, onDelete, onToggle }: ServiceTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-center">Available</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell className="text-muted-foreground max-w-xs truncate">
              {item.description || '-'}
            </TableCell>
            <TableCell className="text-right font-mono">
              ${item.price.toFixed(2)}
            </TableCell>
            <TableCell className="text-center">
              <Switch
                checked={item.is_available}
                onCheckedChange={() => onToggle(item.id, item.is_available)}
              />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(item)}
                >
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
                        Are you sure you want to delete "{item.name}"? This action cannot be undone.
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
