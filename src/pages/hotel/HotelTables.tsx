import { useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import {
  useHotelTables, useHotelTableAreas, useActiveTableSessions,
  useHotelTablesRealtime, useOpenTableSession, HotelTable,
} from '@/hooks/useHotelTables';
import { useStaffSession } from '@/contexts/StaffSessionContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Utensils, Plus, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const statusStyles: Record<string, { label: string; bg: string; border: string; text: string }> = {
  free:     { label: 'Free',     bg: 'bg-emerald-50',  border: 'border-emerald-300', text: 'text-emerald-700' },
  occupied: { label: 'Occupied', bg: 'bg-amber-50',    border: 'border-amber-400',   text: 'text-amber-800'  },
  cleaning: { label: 'Cleaning', bg: 'bg-sky-50',      border: 'border-sky-300',     text: 'text-sky-700'    },
  reserved: { label: 'Reserved', bg: 'bg-purple-50',   border: 'border-purple-300',  text: 'text-purple-700' },
};

export default function HotelTables() {
  useHotelTablesRealtime();
  const navigate = useNavigate();
  const { activeStaff, activeShift } = useStaffSession();
  const { data: areas = [] } = useHotelTableAreas();
  const { data: tables = [], isLoading } = useHotelTables();
  const { data: sessions = [] } = useActiveTableSessions();
  const openSession = useOpenTableSession();

  const [areaId, setAreaId] = useState<string>('all');
  const [openTable, setOpenTable] = useState<HotelTable | null>(null);
  const [guestCount, setGuestCount] = useState(2);

  const sessionByTable = useMemo(() => {
    const map: Record<string, typeof sessions[number]> = {};
    for (const s of sessions) map[s.table_id] = s;
    return map;
  }, [sessions]);

  const filtered = useMemo(() => {
    if (areaId === 'all') return tables;
    return tables.filter(t => t.area_id === areaId);
  }, [tables, areaId]);

  const summary = useMemo(() => {
    const total = tables.length;
    const occupied = tables.filter(t => t.status === 'occupied').length;
    const free = tables.filter(t => t.status === 'free').length;
    const cleaning = tables.filter(t => t.status === 'cleaning').length;
    return { total, occupied, free, cleaning };
  }, [tables]);

  const handleOpen = (table: HotelTable) => {
    const existing = sessionByTable[table.id];
    if (existing) {
      navigate(`/hotel/pos?session=${existing.id}&table=${encodeURIComponent(table.table_number)}`);
      return;
    }
    setOpenTable(table);
    setGuestCount(2);
  };

  const confirmOpen = async () => {
    if (!openTable) return;
    try {
      const session = await openSession.mutateAsync({
        tableId: openTable.id,
        tableNumber: openTable.table_number,
        guestCount,
        staffId: activeStaff?.staff_id ?? null,
        shiftId: activeShift?.id ?? null,
      });
      toast.success(`Table ${openTable.table_number} opened`);
      navigate(`/hotel/pos?session=${session.id}&table=${encodeURIComponent(openTable.table_number)}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Layout>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Utensils className="h-5 w-5 text-primary" /> Floor Plan
            </h1>
            <p className="text-xs text-muted-foreground">Tap a table to open a session or jump back into the POS.</p>
          </div>
          <div className="flex gap-2 text-xs">
            <Badge variant="outline">Total {summary.total}</Badge>
            <Badge className="bg-emerald-500 text-white">Free {summary.free}</Badge>
            <Badge className="bg-amber-500 text-white">Occupied {summary.occupied}</Badge>
            <Badge className="bg-sky-500 text-white">Cleaning {summary.cleaning}</Badge>
          </div>
        </div>

        <Tabs value={areaId} onValueChange={setAreaId}>
          <TabsList>
            <TabsTrigger value="all">All Areas</TabsTrigger>
            {areas.map(a => (
              <TabsTrigger key={a.id} value={a.id}>{a.name}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading tables…
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground text-sm">
            <Sparkles className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            No tables in this area. Create tables from Hotel Settings or seed them in the database.
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
            {filtered.map(t => {
              const session = sessionByTable[t.id];
              const status = statusStyles[t.status] || statusStyles.free;
              return (
                <button
                  key={t.id}
                  onClick={() => handleOpen(t)}
                  className={`relative rounded-lg border-2 ${status.border} ${status.bg} p-3 text-left transition hover:scale-[1.02] hover:shadow`}
                >
                  <div className="flex items-start justify-between">
                    <div className={`font-bold text-lg ${status.text}`}>T{t.table_number}</div>
                    <span className={`text-[10px] uppercase font-semibold ${status.text}`}>{status.label}</span>
                  </div>
                  {t.name && <div className="text-xs text-muted-foreground truncate">{t.name}</div>}
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
                    <Users className="h-3 w-3" /> Cap {t.capacity}
                  </div>
                  {session && (
                    <div className="mt-1 text-[10px] text-amber-700 font-medium">
                      {session.guest_count} guest{session.guest_count !== 1 ? 's' : ''} · open
                    </div>
                  )}
                  {!session && t.status === 'free' && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                      <Plus className="h-3 w-3" /> Tap to seat
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <Dialog open={!!openTable} onOpenChange={(o) => !o && setOpenTable(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Open Table {openTable?.table_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">Number of guests</label>
                <Input
                  type="number"
                  min={1}
                  max={openTable?.capacity ?? 20}
                  value={guestCount}
                  onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value || '1')))}
                />
                {openTable && <p className="text-xs text-muted-foreground mt-1">Capacity: {openTable.capacity}</p>}
              </div>
              <Button
                className="w-full"
                onClick={confirmOpen}
                disabled={openSession.isPending}
              >
                {openSession.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Open Session & Go to POS
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}