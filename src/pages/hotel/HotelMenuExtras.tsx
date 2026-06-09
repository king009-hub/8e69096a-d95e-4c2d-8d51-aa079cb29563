import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Pencil, Ban, CheckCircle2 } from 'lucide-react';
import {
  useModifierGroups, useSaveModifierGroup, useDeleteModifierGroup,
  useSaveModifier, useDeleteModifier, useToggleItemAvailability,
  type ModifierGroup, type Modifier,
} from '@/hooks/useModifiers';
import { useHappyHourRules, useSaveHappyHour, useDeleteHappyHour, type HappyHourRule } from '@/hooks/useHappyHour';
import { useServiceMenu } from '@/hooks/useServiceMenu';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function HotelMenuExtras() {
  return (
    <Layout>
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Menu Controls</h1>
          <p className="text-sm text-muted-foreground">Modifiers, 86'd items and happy-hour pricing.</p>
        </div>
        <Tabs defaultValue="modifiers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="modifiers">Modifier Groups</TabsTrigger>
            <TabsTrigger value="eightysixed">86'd Items</TabsTrigger>
            <TabsTrigger value="happyhour">Happy Hour</TabsTrigger>
          </TabsList>
          <TabsContent value="modifiers"><ModifiersTab /></TabsContent>
          <TabsContent value="eightysixed"><EightySixTab /></TabsContent>
          <TabsContent value="happyhour"><HappyHourTab /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

// ---------- Modifiers ----------
function ModifiersTab() {
  const { data: groups = [] } = useModifierGroups();
  const saveGroup = useSaveModifierGroup();
  const delGroup = useDeleteModifierGroup();
  const saveMod = useSaveModifier();
  const delMod = useDeleteModifier();

  const [groupOpen, setGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Partial<ModifierGroup> | null>(null);

  const [modOpen, setModOpen] = useState(false);
  const [editingMod, setEditingMod] = useState<Partial<Modifier> | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditingGroup({ name: '', min_select: 0, max_select: 1, is_required: false, is_active: true }); setGroupOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Group
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {groups.map(g => (
          <Card key={g.id}>
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div>
                <CardTitle className="text-base flex gap-2 items-center">
                  {g.name}
                  {!g.is_active && <Badge variant="secondary">Inactive</Badge>}
                  {g.is_required && <Badge>Required</Badge>}
                </CardTitle>
                <p className="text-xs text-muted-foreground">Pick {g.min_select}–{g.max_select}</p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setEditingGroup(g); setGroupOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => { if (confirm('Delete group?')) delGroup.mutate(g.id); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {(g.modifiers || []).map(m => (
                <div key={m.id} className="flex items-center justify-between text-sm border rounded px-2 py-1">
                  <div className="flex gap-2 items-center">
                    <span>{m.name}</span>
                    {m.price_delta !== 0 && <Badge variant="outline">{m.price_delta > 0 ? '+' : ''}{m.price_delta}</Badge>}
                    {m.is_default && <Badge variant="secondary">Default</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditingMod(m); setModOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => delMod.mutate(m.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full" onClick={() => { setEditingMod({ group_id: g.id, name: '', price_delta: 0, is_active: true }); setModOpen(true); }}>
                <Plus className="h-3 w-3 mr-1" /> Add Option
              </Button>
            </CardContent>
          </Card>
        ))}
        {groups.length === 0 && <p className="text-sm text-muted-foreground col-span-2">No modifier groups yet.</p>}
      </div>

      {/* Group dialog */}
      <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingGroup?.id ? 'Edit Group' : 'New Modifier Group'}</DialogTitle></DialogHeader>
          {editingGroup && (
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={editingGroup.name || ''} onChange={e => setEditingGroup({ ...editingGroup, name: e.target.value })} placeholder="e.g. Size, Sugar level, Extras" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Min select</Label><Input type="number" value={editingGroup.min_select ?? 0} onChange={e => setEditingGroup({ ...editingGroup, min_select: Number(e.target.value) })} /></div>
                <div><Label>Max select</Label><Input type="number" value={editingGroup.max_select ?? 1} onChange={e => setEditingGroup({ ...editingGroup, max_select: Number(e.target.value) })} /></div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2"><Switch checked={!!editingGroup.is_required} onCheckedChange={v => setEditingGroup({ ...editingGroup, is_required: v })} /> Required</label>
                <label className="flex items-center gap-2"><Switch checked={editingGroup.is_active !== false} onCheckedChange={v => setEditingGroup({ ...editingGroup, is_active: v })} /> Active</label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupOpen(false)}>Cancel</Button>
            <Button onClick={async () => { if (!editingGroup?.name) return; await saveGroup.mutateAsync(editingGroup as any); setGroupOpen(false); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modifier dialog */}
      <Dialog open={modOpen} onOpenChange={setModOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingMod?.id ? 'Edit Option' : 'New Option'}</DialogTitle></DialogHeader>
          {editingMod && (
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={editingMod.name || ''} onChange={e => setEditingMod({ ...editingMod, name: e.target.value })} placeholder="e.g. Large, No sugar" /></div>
              <div><Label>Price delta</Label><Input type="number" value={editingMod.price_delta ?? 0} onChange={e => setEditingMod({ ...editingMod, price_delta: Number(e.target.value) })} /></div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2"><Switch checked={!!editingMod.is_default} onCheckedChange={v => setEditingMod({ ...editingMod, is_default: v })} /> Default</label>
                <label className="flex items-center gap-2"><Switch checked={editingMod.is_active !== false} onCheckedChange={v => setEditingMod({ ...editingMod, is_active: v })} /> Active</label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModOpen(false)}>Cancel</Button>
            <Button onClick={async () => { if (!editingMod?.name || !editingMod.group_id) return; await saveMod.mutateAsync(editingMod as any); setModOpen(false); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- 86'd items ----------
function EightySixTab() {
  const { data: items = [] } = useServiceMenu();
  const toggle = useToggleItemAvailability();
  const [openItem, setOpenItem] = useState<any | null>(null);
  const [reason, setReason] = useState('');
  const [until, setUntil] = useState('');

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Menu Availability</CardTitle></CardHeader>
      <CardContent className="space-y-1 max-h-[70vh] overflow-auto">
        {items.map((it: any) => (
          <div key={it.id} className="flex items-center justify-between border rounded px-2 py-1 text-sm">
            <div>
              <div className="font-medium">{it.name} <span className="text-muted-foreground">· {it.category}</span></div>
              {!it.is_available && (
                <div className="text-xs text-destructive">
                  86'd{it.unavailable_reason ? ` — ${it.unavailable_reason}` : ''}
                  {it.unavailable_until ? ` until ${new Date(it.unavailable_until).toLocaleString()}` : ''}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {it.is_available ? (
                <Button size="sm" variant="outline" onClick={() => { setOpenItem(it); setReason(''); setUntil(''); }}>
                  <Ban className="h-3 w-3 mr-1" /> 86 it
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => toggle.mutate({ id: it.id, is_available: true })}>
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Re-enable
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={!!openItem} onOpenChange={() => setOpenItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>86 {openItem?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Reason (optional)</Label><Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Out of stock, supplier delay…" /></div>
            <div><Label>Available again at (optional)</Label><Input type="datetime-local" value={until} onChange={e => setUntil(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenItem(null)}>Cancel</Button>
            <Button onClick={async () => {
              if (!openItem) return;
              await toggle.mutateAsync({ id: openItem.id, is_available: false, reason: reason || null, until: until ? new Date(until).toISOString() : null });
              setOpenItem(null);
            }}>Confirm 86</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------- Happy Hour ----------
function HappyHourTab() {
  const { data: rules = [] } = useHappyHourRules();
  const { data: items = [] } = useServiceMenu();
  const save = useSaveHappyHour();
  const del = useDeleteHappyHour();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<HappyHourRule> | null>(null);

  const categories = Array.from(new Set((items || []).map((i: any) => i.category)));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing({ name: '', days_of_week: [1,2,3,4,5], start_time: '17:00', end_time: '19:00', discount_percent: 10, apply_to: 'all', is_active: true }); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Rule
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {rules.map(r => (
          <Card key={r.id}>
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div>
                <CardTitle className="text-base">{r.name} {!r.is_active && <Badge variant="secondary" className="ml-1">Off</Badge>}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {(r.days_of_week || []).map(d => DAYS[d]).join(', ')} · {r.start_time}–{r.end_time} · -{r.discount_percent}% · {r.apply_to === 'all' ? 'All items' : r.apply_to === 'category' ? `Cat: ${r.category}` : `Item`}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
          </Card>
        ))}
        {rules.length === 0 && <p className="text-sm text-muted-foreground col-span-2">No happy-hour rules yet.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit Rule' : 'New Happy Hour Rule'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start</Label><Input type="time" value={editing.start_time || ''} onChange={e => setEditing({ ...editing, start_time: e.target.value })} /></div>
                <div><Label>End</Label><Input type="time" value={editing.end_time || ''} onChange={e => setEditing({ ...editing, end_time: e.target.value })} /></div>
              </div>
              <div>
                <Label>Days</Label>
                <div className="flex gap-1 flex-wrap mt-1">
                  {DAYS.map((d, i) => {
                    const active = (editing.days_of_week || []).includes(i);
                    return (
                      <Button key={i} type="button" variant={active ? 'default' : 'outline'} size="sm"
                        onClick={() => {
                          const set = new Set(editing.days_of_week || []);
                          active ? set.delete(i) : set.add(i);
                          setEditing({ ...editing, days_of_week: Array.from(set).sort() });
                        }}>{d}</Button>
                    );
                  })}
                </div>
              </div>
              <div><Label>Discount %</Label><Input type="number" value={editing.discount_percent ?? 0} onChange={e => setEditing({ ...editing, discount_percent: Number(e.target.value) })} /></div>
              <div>
                <Label>Apply to</Label>
                <Select value={editing.apply_to || 'all'} onValueChange={v => setEditing({ ...editing, apply_to: v as any, category: null, service_item_id: null })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All items</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="item">Specific item</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editing.apply_to === 'category' && (
                <div>
                  <Label>Category</Label>
                  <Select value={editing.category || ''} onValueChange={v => setEditing({ ...editing, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {editing.apply_to === 'item' && (
                <div>
                  <Label>Item</Label>
                  <Select value={editing.service_item_id || ''} onValueChange={v => setEditing({ ...editing, service_item_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                    <SelectContent>
                      {items.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <label className="flex items-center gap-2"><Switch checked={editing.is_active !== false} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /> Active</label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!editing?.name || !editing.start_time || !editing.end_time) return;
              await save.mutateAsync(editing as any);
              setOpen(false);
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}