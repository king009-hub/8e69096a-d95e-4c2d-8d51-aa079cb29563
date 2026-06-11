import { useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  ClipboardList,
  Factory,
  PackagePlus,
  Pencil,
  Plus,
  Scale,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useServiceMenu } from '@/hooks/useServiceMenu';
import { useSettingsContext } from '@/contexts/SettingsContext';
import {
  RestaurantIngredient,
  ServiceRecipeItem,
  useDeleteRecipeItem,
  useDeleteRestaurantIngredient,
  useIngredientMovements,
  useLowStockIngredients,
  useRecipeForServiceItem,
  useRecordIngredientMovement,
  useRecordWastage,
  useRestaurantIngredients,
  useSaveRecipeItem,
  useSaveRestaurantIngredient,
  useWastageLog,
} from '@/hooks/useRestaurantIngredients';

const emptyIngredient: Partial<RestaurantIngredient> = {
  name: '',
  description: '',
  purchase_price: 0,
  stock_quantity: 0,
  min_stock_threshold: 5,
  unit: 'pcs',
  category: 'kitchen',
  is_liquid: false,
  volume_per_unit: 1,
  open_unit_volume: 0,
  track_empties: false,
  empty_units_count: 0,
};

const movementReasons = ['Purchase received', 'Manual correction', 'Stock transfer', 'Prep usage', 'Supplier return'];
const wasteReasons = ['Spoilage', 'Expired', 'Kitchen mistake', 'Breakage', 'Staff meal', 'Customer return'];
const unitOptions = ['pcs', 'kg', 'g', 'L', 'ml', 'pack', 'bottle', 'crate', 'portion'];

export default function HotelIngredients() {
  const { formatCurrency } = useSettingsContext();
  const { data: ingredients = [], isLoading } = useRestaurantIngredients();
  const { data: lowStock = [] } = useLowStockIngredients();
  const { data: movements = [] } = useIngredientMovements();
  const { data: wasteLog = [] } = useWastageLog();
  const { data: menuItems = [] } = useServiceMenu();
  const saveIngredient = useSaveRestaurantIngredient();
  const deleteIngredient = useDeleteRestaurantIngredient();
  const recordMovement = useRecordIngredientMovement();
  const recordWaste = useRecordWastage();

  const [search, setSearch] = useState('');
  const [ingredientDialogOpen, setIngredientDialogOpen] = useState(false);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [wasteDialogOpen, setWasteDialogOpen] = useState(false);
  const [ingredientForm, setIngredientForm] = useState<Partial<RestaurantIngredient>>(emptyIngredient);
  const [movementForm, setMovementForm] = useState({ ingredientId: '', movementType: 'in' as 'in' | 'out' | 'adjustment', quantity: '', reason: movementReasons[0], notes: '', unitCost: '' });
  const [wasteForm, setWasteForm] = useState({ ingredientId: '', serviceItemId: '__none', quantity: '', reason: wasteReasons[0], notes: '' });
  const [selectedServiceId, setSelectedServiceId] = useState('');

  const filteredIngredients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return ingredients;
    return ingredients.filter((ingredient) =>
      ingredient.name.toLowerCase().includes(term) ||
      (ingredient.category || '').toLowerCase().includes(term) ||
      (ingredient.description || '').toLowerCase().includes(term)
    );
  }, [ingredients, search]);

  const totalValue = useMemo(
    () => ingredients.reduce((sum, item) => sum + Number(item.stock_quantity) * Number(item.purchase_price), 0),
    [ingredients]
  );

  const selectedService = menuItems.find((item) => item.id === selectedServiceId) || null;

  const openIngredient = (ingredient?: RestaurantIngredient) => {
    setIngredientForm(ingredient || emptyIngredient);
    setIngredientDialogOpen(true);
  };

  const openMovement = (ingredient?: RestaurantIngredient, type: 'in' | 'out' | 'adjustment' = 'in') => {
    setMovementForm({
      ingredientId: ingredient?.id || '',
      movementType: type,
      quantity: '',
      reason: type === 'in' ? movementReasons[0] : 'Manual correction',
      notes: '',
      unitCost: ingredient?.purchase_price ? String(ingredient.purchase_price) : '',
    });
    setMovementDialogOpen(true);
  };

  const openWaste = (ingredient?: RestaurantIngredient) => {
    setWasteForm({ ingredientId: ingredient?.id || '', serviceItemId: '__none', quantity: '', reason: wasteReasons[0], notes: '' });
    setWasteDialogOpen(true);
  };

  const handleIngredientSave = async () => {
    if (!ingredientForm.name?.trim()) return;
    await saveIngredient.mutateAsync({ ...ingredientForm, name: ingredientForm.name.trim() } as RestaurantIngredient);
    setIngredientDialogOpen(false);
  };

  const handleMovementSave = async () => {
    if (!movementForm.ingredientId || !movementForm.quantity || !movementForm.reason) return;
    await recordMovement.mutateAsync({
      ingredientId: movementForm.ingredientId,
      movementType: movementForm.movementType,
      quantity: Number(movementForm.quantity),
      reason: movementForm.reason,
      notes: movementForm.notes || null,
      unitCost: Number(movementForm.unitCost) || 0,
    });
    setMovementDialogOpen(false);
  };

  const handleWasteSave = async () => {
    if (!wasteForm.ingredientId || !wasteForm.quantity || !wasteForm.reason) return;
    await recordWaste.mutateAsync({
      ingredientId: wasteForm.ingredientId,
      quantity: Number(wasteForm.quantity),
      reason: wasteForm.reason,
      serviceItemId: wasteForm.serviceItemId === '__none' ? null : wasteForm.serviceItemId,
      notes: wasteForm.notes || null,
    });
    setWasteDialogOpen(false);
  };

  return (
    <Layout>
      <div className="h-full overflow-auto p-4 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Ingredients</h1>
            <p className="text-sm text-muted-foreground">Recipes, stock movements, wastage, and low-stock control.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => openMovement()}>
              <PackagePlus className="h-4 w-4 mr-2" /> Stock
            </Button>
            <Button variant="outline" onClick={() => openWaste()}>
              <TrendingDown className="h-4 w-4 mr-2" /> Waste
            </Button>
            <Button onClick={() => openIngredient()}>
              <Plus className="h-4 w-4 mr-2" /> Ingredient
            </Button>
          </div>
        </div>

        {lowStock.length > 0 && (
          <Alert className="border-destructive/50 bg-destructive/5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              {lowStock.length} ingredient{lowStock.length === 1 ? '' : 's'} below threshold: {lowStock.slice(0, 6).map((item) => item.name).join(', ')}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric title="Ingredients" value={ingredients.length.toString()} icon={Factory} />
          <Metric title="Low Stock" value={lowStock.length.toString()} icon={AlertTriangle} tone="destructive" />
          <Metric title="Stock Value" value={formatCurrency(totalValue)} icon={Scale} />
          <Metric title="Waste Entries" value={wasteLog.length.toString()} icon={ClipboardList} />
        </div>

        <Tabs defaultValue="ingredients" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
            <TabsTrigger value="recipes">Recipes</TabsTrigger>
            <TabsTrigger value="waste">Waste</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="movements">Movements</TabsTrigger>
          </TabsList>

          <TabsContent value="ingredients">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <CardTitle className="text-base">Ingredient Stock</CardTitle>
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ingredients" className="pl-8" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="py-8 text-center text-muted-foreground">Loading ingredients...</p>
                ) : (
                  <IngredientTable
                    ingredients={filteredIngredients}
                    formatCurrency={formatCurrency}
                    onEdit={openIngredient}
                    onStock={(ingredient) => openMovement(ingredient, 'in')}
                    onWaste={openWaste}
                    onDelete={(id) => deleteIngredient.mutate(id)}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recipes">
            <RecipeManager
              ingredients={ingredients}
              serviceItems={menuItems}
              selectedServiceId={selectedServiceId}
              onSelectService={setSelectedServiceId}
              selectedServiceName={selectedService?.name || ''}
              formatCurrency={formatCurrency}
            />
          </TabsContent>

          <TabsContent value="waste">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Wastage History</CardTitle>
                <Button size="sm" onClick={() => openWaste()}><Plus className="h-4 w-4 mr-2" /> Record Waste</Button>
              </CardHeader>
              <CardContent>
                <WasteTable wasteLog={wasteLog} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts">
            <Card>
              <CardHeader><CardTitle className="text-base">Low-Stock Alerts</CardTitle></CardHeader>
              <CardContent>
                <IngredientTable
                  ingredients={lowStock}
                  formatCurrency={formatCurrency}
                  onEdit={openIngredient}
                  onStock={(ingredient) => openMovement(ingredient, 'in')}
                  onWaste={openWaste}
                  onDelete={(id) => deleteIngredient.mutate(id)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="movements">
            <Card>
              <CardHeader><CardTitle className="text-base">Ingredient Movement History</CardTitle></CardHeader>
              <CardContent>
                <MovementTable movements={movements} formatCurrency={formatCurrency} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <IngredientDialog
          open={ingredientDialogOpen}
          onOpenChange={setIngredientDialogOpen}
          form={ingredientForm}
          setForm={setIngredientForm}
          onSave={handleIngredientSave}
          isPending={saveIngredient.isPending}
        />

        <StockMovementDialog
          open={movementDialogOpen}
          onOpenChange={setMovementDialogOpen}
          ingredients={ingredients}
          form={movementForm}
          setForm={setMovementForm}
          onSave={handleMovementSave}
          isPending={recordMovement.isPending}
        />

        <WasteDialog
          open={wasteDialogOpen}
          onOpenChange={setWasteDialogOpen}
          ingredients={ingredients}
          serviceItems={menuItems}
          form={wasteForm}
          setForm={setWasteForm}
          onSave={handleWasteSave}
          isPending={recordWaste.isPending}
        />
      </div>
    </Layout>
  );
}

function Metric({ title, value, icon: Icon, tone }: { title: string; value: string; icon: typeof Factory; tone?: 'destructive' }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
        <Icon className={`h-5 w-5 ${tone === 'destructive' ? 'text-destructive' : 'text-primary'}`} />
      </CardContent>
    </Card>
  );
}

function IngredientTable({ ingredients, formatCurrency, onEdit, onStock, onWaste, onDelete }: {
  ingredients: RestaurantIngredient[];
  formatCurrency: (amount: number) => string;
  onEdit: (ingredient: RestaurantIngredient) => void;
  onStock: (ingredient: RestaurantIngredient) => void;
  onWaste: (ingredient: RestaurantIngredient) => void;
  onDelete: (id: string) => void;
}) {
  if (ingredients.length === 0) return <p className="py-8 text-center text-muted-foreground">No ingredients found.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Stock</TableHead>
          <TableHead className="text-right">Threshold</TableHead>
          <TableHead className="text-right">Unit Cost</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ingredients.map((ingredient) => {
          const isLow = Number(ingredient.stock_quantity) <= Number(ingredient.min_stock_threshold);
          return (
            <TableRow key={ingredient.id}>
              <TableCell>
                <div className="font-medium">{ingredient.name}</div>
                {ingredient.description && <div className="text-xs text-muted-foreground line-clamp-1">{ingredient.description}</div>}
              </TableCell>
              <TableCell>{ingredient.category || 'kitchen'}</TableCell>
              <TableCell className="text-right font-mono">{Number(ingredient.stock_quantity).toLocaleString()} {ingredient.unit}</TableCell>
              <TableCell className="text-right font-mono">{Number(ingredient.min_stock_threshold).toLocaleString()} {ingredient.unit}</TableCell>
              <TableCell className="text-right">{formatCurrency(Number(ingredient.purchase_price))}</TableCell>
              <TableCell>
                <Badge variant={isLow ? 'destructive' : 'outline'}>{isLow ? 'Low' : 'OK'}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onStock(ingredient)}><PackagePlus className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onWaste(ingredient)}><TrendingDown className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(ingredient)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(ingredient.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function RecipeManager({ ingredients, serviceItems, selectedServiceId, onSelectService, selectedServiceName, formatCurrency }: {
  ingredients: RestaurantIngredient[];
  serviceItems: Array<{ id: string; name: string; category: string }>;
  selectedServiceId: string;
  onSelectService: (id: string) => void;
  selectedServiceName: string;
  formatCurrency: (amount: number) => string;
}) {
  const { data: recipe = [] } = useRecipeForServiceItem(selectedServiceId || undefined);
  const saveRecipe = useSaveRecipeItem();
  const deleteRecipe = useDeleteRecipeItem();
  const [line, setLine] = useState<Partial<ServiceRecipeItem>>({ ingredient_id: '', quantity_required: 1, unit: 'pcs' });

  const recipeCost = recipe.reduce((sum, row) => sum + Number(row.quantity_required) * Number(row.ingredient?.purchase_price || 0), 0);
  const maxServings = recipe.length === 0 ? 0 : Math.min(...recipe.map((row) => {
    const required = Number(row.quantity_required) || 0;
    if (required <= 0) return Number.MAX_SAFE_INTEGER;
    return Math.floor(Number(row.ingredient?.stock_quantity || 0) / required);
  }));

  const handleIngredientSelect = (ingredientId: string) => {
    const ingredient = ingredients.find((item) => item.id === ingredientId);
    setLine({ ...line, ingredient_id: ingredientId, unit: ingredient?.unit || line.unit || 'pcs' });
  };

  const handleSave = async () => {
    if (!selectedServiceId || !line.ingredient_id || !line.quantity_required) return;
    await saveRecipe.mutateAsync({
      ...line,
      service_item_id: selectedServiceId,
      ingredient_id: line.ingredient_id,
      quantity_required: Number(line.quantity_required),
      unit: line.unit || 'pcs',
    } as ServiceRecipeItem & { service_item_id: string; ingredient_id: string });
    setLine({ ingredient_id: '', quantity_required: 1, unit: 'pcs' });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
          <div className="space-y-2">
            <Label>Menu item</Label>
            <Select value={selectedServiceId} onValueChange={onSelectService}>
              <SelectTrigger><SelectValue placeholder="Select menu item" /></SelectTrigger>
              <SelectContent>
                {serviceItems.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {item.category}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="justify-center py-2">Cost: {formatCurrency(recipeCost)}</Badge>
          <Badge variant={maxServings <= 5 && recipe.length > 0 ? 'destructive' : 'secondary'} className="justify-center py-2">
            Can make: {recipe.length === 0 ? '—' : maxServings}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedServiceId ? (
          <p className="py-8 text-center text-muted-foreground">Select a menu item to build its recipe.</p>
        ) : (
          <>
            <div className="rounded-md border p-3 space-y-3">
              <div className="font-medium">Recipe for {selectedServiceName}</div>
              <div className="grid gap-3 md:grid-cols-[1fr_120px_100px_auto] md:items-end">
                <div className="space-y-2">
                  <Label>Ingredient</Label>
                  <Select value={line.ingredient_id || ''} onValueChange={handleIngredientSelect}>
                    <SelectTrigger><SelectValue placeholder="Select ingredient" /></SelectTrigger>
                    <SelectContent>
                      {ingredients.map((ingredient) => (
                        <SelectItem key={ingredient.id} value={ingredient.id}>{ingredient.name} · {ingredient.stock_quantity} {ingredient.unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Qty per item</Label>
                  <Input type="number" min="0" step="0.001" value={line.quantity_required || ''} onChange={(event) => setLine({ ...line, quantity_required: Number(event.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={line.unit || 'pcs'} onValueChange={(value) => setLine({ ...line, unit: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{unitOptions.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSave} disabled={saveRecipe.isPending}><Plus className="h-4 w-4 mr-2" /> Add</Button>
              </div>
            </div>

            {recipe.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No recipe lines yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead className="text-right">Per Item</TableHead>
                    <TableHead className="text-right">On Hand</TableHead>
                    <TableHead className="text-right">Line Cost</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipe.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.ingredient?.name || 'Unknown ingredient'}</TableCell>
                      <TableCell className="text-right font-mono">{row.quantity_required} {row.unit}</TableCell>
                      <TableCell className="text-right font-mono">{row.ingredient?.stock_quantity ?? 0} {row.ingredient?.unit || row.unit}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(row.quantity_required) * Number(row.ingredient?.purchase_price || 0))}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => deleteRecipe.mutate({ id: row.id, serviceItemId: selectedServiceId })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MovementTable({ movements, formatCurrency }: { movements: ReturnType<typeof useIngredientMovements>['data']; formatCurrency: (amount: number) => string }) {
  const rows = movements || [];
  if (rows.length === 0) return <p className="py-8 text-center text-muted-foreground">No movement history yet.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Ingredient</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Cost</TableHead>
          <TableHead>Reason</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((movement) => (
          <TableRow key={movement.id}>
            <TableCell className="text-muted-foreground">{movement.created_at ? new Date(movement.created_at).toLocaleString() : '—'}</TableCell>
            <TableCell className="font-medium">{movement.ingredient?.name || 'Unknown'}</TableCell>
            <TableCell>
              <Badge variant={movement.movement_type === 'out' ? 'destructive' : movement.movement_type === 'in' ? 'default' : 'secondary'}>
                {movement.movement_type === 'in' && <TrendingUp className="h-3 w-3 mr-1" />}
                {movement.movement_type === 'out' && <TrendingDown className="h-3 w-3 mr-1" />}
                {movement.movement_type}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-mono">{movement.quantity} {movement.ingredient?.unit || ''}</TableCell>
            <TableCell className="text-right">{formatCurrency(Number(movement.total_cost || 0))}</TableCell>
            <TableCell>{movement.reason}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function WasteTable({ wasteLog }: { wasteLog: ReturnType<typeof useWastageLog>['data'] }) {
  const rows = wasteLog || [];
  if (rows.length === 0) return <p className="py-8 text-center text-muted-foreground">No waste recorded.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Ingredient</TableHead>
          <TableHead>Menu Item</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((waste) => (
          <TableRow key={waste.id}>
            <TableCell className="text-muted-foreground">{waste.created_at ? new Date(waste.created_at).toLocaleString() : '—'}</TableCell>
            <TableCell className="font-medium">{waste.ingredient?.name || 'Unknown'}</TableCell>
            <TableCell>{waste.service_item?.name || '—'}</TableCell>
            <TableCell className="text-right font-mono">{waste.quantity} {waste.ingredient?.unit || ''}</TableCell>
            <TableCell>{waste.reason}</TableCell>
            <TableCell className="text-muted-foreground">{waste.notes || '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function IngredientDialog({ open, onOpenChange, form, setForm, onSave, isPending }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: Partial<RestaurantIngredient>;
  setForm: (form: Partial<RestaurantIngredient>) => void;
  onSave: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{form.id ? 'Edit Ingredient' : 'New Ingredient'}</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2 max-h-[65vh] overflow-auto pr-1">
          <div className="space-y-2"><Label>Name</Label><Input value={form.name || ''} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
          <div className="space-y-2"><Label>Category</Label><Input value={form.category || ''} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="kitchen, bar, dry store" /></div>
          <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={2} /></div>
          <div className="space-y-2"><Label>Current Stock</Label><Input type="number" min="0" step="0.001" value={form.stock_quantity ?? 0} onChange={(event) => setForm({ ...form, stock_quantity: Number(event.target.value) })} /></div>
          <div className="space-y-2"><Label>Low Stock Threshold</Label><Input type="number" min="0" step="0.001" value={form.min_stock_threshold ?? 0} onChange={(event) => setForm({ ...form, min_stock_threshold: Number(event.target.value) })} /></div>
          <div className="space-y-2"><Label>Unit</Label><Select value={form.unit || 'pcs'} onValueChange={(value) => setForm({ ...form, unit: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{unitOptions.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Unit Cost</Label><Input type="number" min="0" step="1" value={form.purchase_price ?? 0} onChange={(event) => setForm({ ...form, purchase_price: Number(event.target.value) })} /></div>
          <div className="flex items-center gap-2 pt-6"><Switch checked={!!form.is_liquid} onCheckedChange={(value) => setForm({ ...form, is_liquid: value })} /><Label>Liquid / volume based</Label></div>
          <div className="flex items-center gap-2 pt-6"><Switch checked={!!form.track_empties} onCheckedChange={(value) => setForm({ ...form, track_empties: value })} /><Label>Track empties</Label></div>
          <div className="space-y-2"><Label>Volume Per Unit</Label><Input type="number" min="0" step="0.001" value={form.volume_per_unit ?? 1} onChange={(event) => setForm({ ...form, volume_per_unit: Number(event.target.value) })} /></div>
          <div className="space-y-2"><Label>Empty Units</Label><Input type="number" min="0" value={form.empty_units_count ?? 0} onChange={(event) => setForm({ ...form, empty_units_count: Number(event.target.value) })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StockMovementDialog({ open, onOpenChange, ingredients, form, setForm, onSave, isPending }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredients: RestaurantIngredient[];
  form: { ingredientId: string; movementType: 'in' | 'out' | 'adjustment'; quantity: string; reason: string; notes: string; unitCost: string };
  setForm: (form: { ingredientId: string; movementType: 'in' | 'out' | 'adjustment'; quantity: string; reason: string; notes: string; unitCost: string }) => void;
  onSave: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record Ingredient Stock</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>Ingredient</Label><Select value={form.ingredientId} onValueChange={(value) => setForm({ ...form, ingredientId: value })}><SelectTrigger><SelectValue placeholder="Select ingredient" /></SelectTrigger><SelectContent>{ingredients.map((ingredient) => <SelectItem key={ingredient.id} value={ingredient.id}>{ingredient.name} · {ingredient.stock_quantity} {ingredient.unit}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Type</Label><Select value={form.movementType} onValueChange={(value: 'in' | 'out' | 'adjustment') => setForm({ ...form, movementType: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="in">Stock In</SelectItem><SelectItem value="out">Stock Out</SelectItem><SelectItem value="adjustment">Set Actual</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Quantity</Label><Input type="number" min="0" step="0.001" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Reason</Label><Select value={form.reason} onValueChange={(value) => setForm({ ...form, reason: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{movementReasons.map((reason) => <SelectItem key={reason} value={reason}>{reason}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Unit Cost</Label><Input type="number" min="0" step="1" value={form.unitCost} onChange={(event) => setForm({ ...form, unitCost: event.target.value })} /></div>
          <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WasteDialog({ open, onOpenChange, ingredients, serviceItems, form, setForm, onSave, isPending }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredients: RestaurantIngredient[];
  serviceItems: Array<{ id: string; name: string }>;
  form: { ingredientId: string; serviceItemId: string; quantity: string; reason: string; notes: string };
  setForm: (form: { ingredientId: string; serviceItemId: string; quantity: string; reason: string; notes: string }) => void;
  onSave: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record Waste</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>Ingredient</Label><Select value={form.ingredientId} onValueChange={(value) => setForm({ ...form, ingredientId: value })}><SelectTrigger><SelectValue placeholder="Select ingredient" /></SelectTrigger><SelectContent>{ingredients.map((ingredient) => <SelectItem key={ingredient.id} value={ingredient.id}>{ingredient.name} · {ingredient.stock_quantity} {ingredient.unit}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Quantity</Label><Input type="number" min="0" step="0.001" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></div>
            <div className="space-y-2"><Label>Reason</Label><Select value={form.reason} onValueChange={(value) => setForm({ ...form, reason: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{wasteReasons.map((reason) => <SelectItem key={reason} value={reason}>{reason}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="space-y-2"><Label>Menu Item</Label><Select value={form.serviceItemId} onValueChange={(value) => setForm({ ...form, serviceItemId: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none">Not linked</SelectItem>{serviceItems.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={isPending}>Save Waste</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}