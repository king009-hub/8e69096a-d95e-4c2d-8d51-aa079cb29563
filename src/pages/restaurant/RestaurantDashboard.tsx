import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { useStaffSession } from '@/contexts/StaffSessionContext';
import {
  ChefHat, Wine, ShoppingCart, UtensilsCrossed, TrendingUp, Users,
  AlertTriangle, Clock, Loader2, ArrowRight, Receipt, CircleDot,
  Pause, Play, RefreshCw, AlertCircle, Banknote, Wallet, CreditCard, Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';

interface OrderRow {
  id: string;
  order_number: string;
  table_number: string | null;
  status: string;
  total_amount: number;
  created_at: string;
  waiter: { first_name: string; last_name: string } | null;
  items: { name: string; quantity: number; total_price: number; station: string; item_type: string | null }[];
}

const ORDER_STATUSES = [
  'pending', 'confirmed', 'preparing', 'ready', 'served',
  'awaiting_approval', 'pending_handover', 'completed', 'cancelled'
] as const;

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'mobile_money', label: 'Mobile Money', icon: Wallet },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Wallet },
] as const;

function useRestaurantData(refetchInterval: number | false) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startIso = today.toISOString();

  return useQuery({
    queryKey: ['restaurant-dashboard', startIso],
    queryFn: async () => {
      const [ordersRes, menuRes, shiftsRes] = await Promise.all([
        supabase
          .from('hotel_orders')
          .select(`
            id, order_number, table_number, status, total_amount, created_at, waiter_id,
            waiter:hotel_staff!hotel_orders_waiter_id_fkey(first_name, last_name),
            items:hotel_order_items(name, quantity, total_price, station, item_type)
          `)
          .gte('created_at', startIso)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('hotel_service_menu')
          .select('id, name, category, stock_quantity, min_stock_threshold, track_stock'),
        supabase
          .from('hotel_staff_shifts')
          .select('id, shift_label, staff_id, opened_at, closed_at, status, total_sales, total_items, staff:hotel_staff!hotel_staff_shifts_staff_id_fkey(first_name, last_name, role)')
          .eq('status', 'open'),
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (menuRes.error) throw menuRes.error;
      if (shiftsRes.error) throw shiftsRes.error;

      const orders = (ordersRes.data || []) as unknown as OrderRow[];

      // Aggregations
      let kitchenSales = 0;
      let barSales = 0;
      let kitchenItems = 0;
      let barItems = 0;
      const itemTotals = new Map<string, { name: string; qty: number; total: number }>();
      const waiterTotals = new Map<string, { name: string; orders: number; total: number }>();

      for (const o of orders) {
        const waiterName = o.waiter ? `${o.waiter.first_name} ${o.waiter.last_name}` : 'Unassigned';
        const w = waiterTotals.get(waiterName) || { name: waiterName, orders: 0, total: 0 };
        w.orders += 1;
        w.total += Number(o.total_amount || 0);
        waiterTotals.set(waiterName, w);

        for (const it of o.items || []) {
          const isBar = it.station === 'bar' || it.item_type === 'drink' || it.item_type === 'beverage';
          if (isBar) {
            barSales += Number(it.total_price || 0);
            barItems += it.quantity;
          } else {
            kitchenSales += Number(it.total_price || 0);
            kitchenItems += it.quantity;
          }
          const k = itemTotals.get(it.name) || { name: it.name, qty: 0, total: 0 };
          k.qty += it.quantity;
          k.total += Number(it.total_price || 0);
          itemTotals.set(it.name, k);
        }
      }

      const activeOrders = orders.filter(o =>
        ['pending', 'preparing', 'ready', 'awaiting_approval', 'pending_handover', 'confirmed'].includes(o.status)
      );
      const tablesInUse = new Set(activeOrders.map(o => o.table_number).filter(Boolean));

      const lowStock = (menuRes.data || []).filter((m: any) =>
        m.track_stock && m.stock_quantity <= m.min_stock_threshold
      );

      const topItems = Array.from(itemTotals.values())
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

      const topWaiters = Array.from(waiterTotals.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      return {
        orders,
        activeOrders,
        tablesInUse: Array.from(tablesInUse) as string[],
        kitchenSales,
        barSales,
        kitchenItems,
        barItems,
        totalSales: kitchenSales + barSales,
        ordersCount: orders.length,
        topItems,
        topWaiters,
        lowStock,
        activeShifts: shiftsRes.data || [],
      };
    },
    refetchInterval,
  });
}

interface OrderPayment {
  id: string;
  amount: number;
  type: string;
  created_at: string;
}

function useOrderPayments(orderId: string | null) {
  return useQuery({
    queryKey: ['order-payments', orderId],
    enabled: !!orderId,
    queryFn: async (): Promise<OrderPayment[]> => {
      const { data, error } = await supabase
        .from('hotel_shift_transactions')
        .select('id, amount, type, created_at')
        .eq('reference_id', orderId!)
        .like('type', 'order_payment%')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as OrderPayment[];
    },
  });
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500',
  preparing: 'bg-blue-500',
  ready: 'bg-emerald-500',
  served: 'bg-gray-400',
  awaiting_approval: 'bg-purple-500',
  pending_handover: 'bg-orange-500',
  confirmed: 'bg-cyan-500',
};

export default function RestaurantDashboard() {
  const navigate = useNavigate();
  const { formatCurrency } = useSettingsContext();
  const { activeStaff, activeShift } = useStaffSession();
  const queryClient = useQueryClient();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<string>('cash');
  const [paying, setPaying] = useState(false);
  const { data, isLoading, isFetching, isError, error, refetch } =
    useRestaurantData(autoRefresh ? 15000 : false);
  const {
    data: payments = [],
    isLoading: paymentsLoading,
    refetch: refetchPayments,
  } = useOrderPayments(selectedOrder?.id ?? null);

  const paidTotal = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const orderTotal = Number(selectedOrder?.total_amount || 0);
  const remaining = Math.max(orderTotal - paidTotal, 0);
  const isFullyPaid = selectedOrder ? remaining <= 0.01 : false;

  const openOrder = (o: OrderRow) => {
    setSelectedOrder(o);
    setNewStatus(o.status);
    setPayAmount('');
    setPayMethod('cash');
  };

  // Idempotency refs: prevent duplicate split payments from double-clicks or retries
  const paymentLockRef = useRef(false);
  const recentPaymentsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (selectedOrder && payAmount === '') {
      setPayAmount(remaining > 0 ? String(remaining) : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrder?.id, paymentsLoading]);

  const handleUpdateStatus = async () => {
    if (!selectedOrder || newStatus === selectedOrder.status) return;
    setUpdating(true);
    const { error } = await supabase
      .from('hotel_orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', selectedOrder.id);
    setUpdating(false);
    if (error) {
      toast.error(`Failed to update: ${error.message}`);
      return;
    }
    toast.success(`Order #${selectedOrder.order_number} → ${newStatus.replace('_', ' ')}`);
    setSelectedOrder(null);
    queryClient.invalidateQueries({ queryKey: ['restaurant-dashboard'] });
  };

  const handleAddPayment = async () => {
    if (!selectedOrder) return;
    // Idempotency guard: prevent rapid duplicate submissions (double clicks / retries)
    if (paymentLockRef.current) {
      return;
    }
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a payment amount greater than zero');
      return;
    }
    if (amount > remaining + 0.01) {
      toast.error(`Amount exceeds remaining balance of ${formatCurrency(remaining)}`);
      return;
    }
    if (!activeStaff || !activeShift) {
      toast.error('Open a shift before recording payments');
      return;
    }
    // Signature-based dedupe: same order+method+amount+paid-state within 10s = duplicate
    const signature = `${selectedOrder.id}|${payMethod}|${amount.toFixed(2)}|${paidTotal.toFixed(2)}`;
    const now = Date.now();
    const lastAt = recentPaymentsRef.current.get(signature);
    if (lastAt && now - lastAt < 10_000) {
      toast.warning('Duplicate payment ignored');
      return;
    }
    paymentLockRef.current = true;
    setPaying(true);
    const newPaid = paidTotal + amount;
    const newRemaining = orderTotal - newPaid;
    const newStatusValue = newRemaining <= 0.01 ? 'paid' : 'partial';

    const { error: txError } = await supabase
      .from('hotel_shift_transactions')
      .insert({
        type: `order_payment_${payMethod}`,
        amount,
        reference_id: selectedOrder.id,
        staff_id: activeStaff.staff_id,
        shift_id: activeShift.id,
      });
    if (txError) {
      paymentLockRef.current = false;
      setPaying(false);
      toast.error(`Payment failed: ${txError.message}`);
      return;
    }
    recentPaymentsRef.current.set(signature, now);
    // Trim old entries
    for (const [k, t] of recentPaymentsRef.current) {
      if (now - t > 30_000) recentPaymentsRef.current.delete(k);
    }

    await supabase
      .from('hotel_orders')
      .update({
        payment_status: newStatusValue,
        payment_method: newRemaining <= 0.01 ? payMethod : null,
        payment_received_at: newRemaining <= 0.01 ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedOrder.id);

    paymentLockRef.current = false;
    setPaying(false);
    setPayAmount('');
    toast.success(
      newRemaining <= 0.01
        ? `Order #${selectedOrder.order_number} fully paid`
        : `Recorded ${formatCurrency(amount)} • ${formatCurrency(newRemaining)} remaining`
    );
    refetchPayments();
    queryClient.invalidateQueries({ queryKey: ['restaurant-dashboard'] });
  };

  const handleRemovePayment = async (paymentId: string) => {
    const { error: delError } = await supabase
      .from('hotel_shift_transactions')
      .delete()
      .eq('id', paymentId);
    if (delError) {
      toast.error(`Failed to remove: ${delError.message}`);
      return;
    }
    toast.success('Payment removed');
    refetchPayments();
    queryClient.invalidateQueries({ queryKey: ['restaurant-dashboard'] });
  };

  // ===== Loading state =====
  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4 p-3 md:p-6">
          <Skeleton className="h-12 w-72" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </Layout>
    );
  }

  // ===== Error state =====
  if (isError || !data) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-96 gap-3 p-6 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <div>
            <p className="text-base font-semibold">Failed to load dashboard</p>
            <p className="text-sm text-muted-foreground mt-1">
              {(error as Error)?.message || 'Something went wrong fetching data.'}
            </p>
          </div>
          <Button onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Try again
          </Button>
        </div>
      </Layout>
    );
  }

  const salesChartData = [
    { name: 'Kitchen', sales: data.kitchenSales, items: data.kitchenItems, fill: 'hsl(var(--primary))' },
    { name: 'Bar', sales: data.barSales, items: data.barItems, fill: 'hsl(var(--accent))' },
  ];

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6 p-3 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <UtensilsCrossed className="h-7 w-7 text-primary" />
              Restaurant Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), 'EEEE, MMM d, yyyy')} • Live overview
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh now"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant={autoRefresh ? 'outline' : 'secondary'}
              size="icon"
              onClick={() => setAutoRefresh(v => !v)}
              title={autoRefresh ? 'Pause auto-refresh' : 'Resume auto-refresh'}
            >
              {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button onClick={() => navigate('/hotel/pos')} className="gap-2">
              <ShoppingCart className="h-4 w-4" /> New Order
            </Button>
            <Button variant="outline" onClick={() => navigate('/hotel/kitchen')} className="gap-2">
              <ChefHat className="h-4 w-4" /> Kitchen
            </Button>
            <Button variant="outline" onClick={() => navigate('/hotel/bar')} className="gap-2">
              <Wine className="h-4 w-4" /> Bar
            </Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Today's Sales</p>
                  <p className="text-xl md:text-2xl font-bold">{formatCurrency(data.totalSales)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Active Orders</p>
                  <p className="text-xl md:text-2xl font-bold">{data.activeOrders.length}</p>
                </div>
                <Receipt className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Tables in Use</p>
                  <p className="text-xl md:text-2xl font-bold">{data.tablesInUse.length}</p>
                </div>
                <CircleDot className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Open Shifts</p>
                  <p className="text-xl md:text-2xl font-bold">{data.activeShifts.length}</p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales split + Top items */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Kitchen vs Bar Sales (Today)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-lg border p-3 bg-primary/5">
                  <div className="flex items-center gap-2 mb-1">
                    <ChefHat className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium">Kitchen</span>
                  </div>
                  <p className="text-lg font-bold">{formatCurrency(data.kitchenSales)}</p>
                  <p className="text-xs text-muted-foreground">{data.kitchenItems} items</p>
                </div>
                <div className="rounded-lg border p-3 bg-accent/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Wine className="h-4 w-4 text-accent-foreground" />
                    <span className="text-xs font-medium">Bar</span>
                  </div>
                  <p className="text-lg font-bold">{formatCurrency(data.barSales)}</p>
                  <p className="text-xs text-muted-foreground">{data.barItems} items</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={salesChartData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                  <Bar dataKey="sales" radius={[6, 6, 0, 0]}>
                    {salesChartData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Selling Items</CardTitle>
            </CardHeader>
            <CardContent>
              {data.topItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No sales yet today</p>
              ) : (
                <ul className="space-y-2">
                  {data.topItems.map((it, i) => (
                    <li key={it.name} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="w-6 h-6 rounded-full p-0 flex items-center justify-center">
                          {i + 1}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">{it.name}</p>
                          <p className="text-xs text-muted-foreground">{it.qty} sold</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold">{formatCurrency(it.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Live orders + Tables */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Live Orders ({data.activeOrders.length})
              <span className="text-xs font-normal text-muted-foreground ml-2">
                {autoRefresh ? 'Auto-refresh: 15s' : 'Paused'}
              </span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/hotel/pos')} className="gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {data.activeOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No active orders right now</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.activeOrders.slice(0, 9).map(o => (
                  <button
                    key={o.id}
                    onClick={() => openOrder(o)}
                    className="text-left rounded-lg border p-3 hover:shadow-md hover:border-primary transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[o.status] || 'bg-gray-400'}`} />
                        <span className="text-sm font-bold">#{o.order_number}</span>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">{o.status.replace('_', ' ')}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span>{o.table_number ? `Table ${o.table_number}` : 'Takeaway'}</span>
                      <span>{format(new Date(o.created_at), 'p')}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2 truncate">
                      {(o.items || []).slice(0, 2).map(i => `${i.quantity}× ${i.name}`).join(', ')}
                      {(o.items?.length || 0) > 2 && ` +${o.items.length - 2}`}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">{o.waiter ? `${o.waiter.first_name}` : '—'}</span>
                      <span className="text-sm font-bold">{formatCurrency(o.total_amount)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Staff/shift performance + Low stock */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Staff Performance (Today)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.topWaiters.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No staff activity yet</p>
              ) : (
                <ul className="space-y-2">
                  {data.topWaiters.map((w, i) => (
                    <li key={w.name} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="w-6 h-6 rounded-full p-0 flex items-center justify-center">
                          {i + 1}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">{w.name}</p>
                          <p className="text-xs text-muted-foreground">{w.orders} orders</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold">{formatCurrency(w.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {data.activeShifts.length > 0 && (
                <>
                  <div className="border-t my-3" />
                  <p className="text-xs font-medium mb-2 text-muted-foreground">Open Shifts</p>
                  <div className="space-y-1">
                    {data.activeShifts.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between text-xs">
                        <span>
                          {s.staff?.first_name} {s.staff?.last_name}
                          <span className="text-muted-foreground ml-1 capitalize">({s.staff?.role})</span>
                        </span>
                        <Badge variant="outline" className="text-xs capitalize">{s.shift_label}</Badge>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" /> Low Stock Alerts ({data.lowStock.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.lowStock.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">All items well stocked ✓</p>
              ) : (
                <ul className="space-y-2">
                  {data.lowStock.slice(0, 8).map((m: any) => (
                    <li key={m.id} className="flex items-center justify-between p-2 rounded-md border border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
                      <div>
                        <p className="text-sm font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{m.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-orange-600">{m.stock_quantity}</p>
                        <p className="text-xs text-muted-foreground">min {m.min_stock_threshold}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={(o) => !o && setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Order #{selectedOrder?.order_number}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Table</p>
                  <p className="font-medium">{selectedOrder.table_number || 'Takeaway'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Waiter</p>
                  <p className="font-medium">
                    {selectedOrder.waiter
                      ? `${selectedOrder.waiter.first_name} ${selectedOrder.waiter.last_name}`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="font-medium">{format(new Date(selectedOrder.created_at), 'PPp')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current Status</p>
                  <Badge variant="outline" className="capitalize">
                    {selectedOrder.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Items</p>
                <div className="border rounded-md divide-y max-h-60 overflow-auto">
                  {(selectedOrder.items || []).map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 text-sm">
                      <div className="flex items-center gap-2">
                        {it.station === 'bar' ? (
                          <Wine className="h-3 w-3 text-accent-foreground" />
                        ) : (
                          <ChefHat className="h-3 w-3 text-primary" />
                        )}
                        <span>{it.quantity}× {it.name}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(it.total_price)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 pt-2 border-t text-sm font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(selectedOrder.total_amount)}</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Update Status</p>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map(s => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Split payments */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Banknote className="h-3.5 w-3.5" /> Payments
                  </p>
                  <Badge variant={isFullyPaid ? 'default' : remaining < orderTotal ? 'secondary' : 'outline'}>
                    {isFullyPaid ? 'Paid' : remaining < orderTotal ? 'Partial' : 'Unpaid'}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded bg-background p-2">
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-bold">{formatCurrency(orderTotal)}</p>
                  </div>
                  <div className="rounded bg-background p-2">
                    <p className="text-muted-foreground">Paid</p>
                    <p className="font-bold text-emerald-600">{formatCurrency(paidTotal)}</p>
                  </div>
                  <div className="rounded bg-background p-2">
                    <p className="text-muted-foreground">Remaining</p>
                    <p className={`font-bold ${remaining > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                      {formatCurrency(remaining)}
                    </p>
                  </div>
                </div>

                {paymentsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : payments.length > 0 ? (
                  <div className="space-y-1 max-h-32 overflow-auto">
                    {payments.map(p => {
                      const method = p.type.replace('order_payment_', '').replace('_', ' ');
                      return (
                        <div key={p.id} className="flex items-center justify-between text-xs bg-background rounded px-2 py-1.5">
                          <div className="flex items-center gap-2">
                            <Banknote className="h-3 w-3 text-emerald-600" />
                            <span className="capitalize">{method}</span>
                            <span className="text-muted-foreground">
                              {format(new Date(p.created_at), 'p')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-bold">{formatCurrency(p.amount)}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => handleRemovePayment(p.id)}
                              title="Remove payment"
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">No payments recorded yet</p>
                )}

                {!isFullyPaid && (
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="Amount"
                      className="flex-1"
                    />
                    <Select value={payMethod} onValueChange={setPayMethod}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map(m => (
                          <SelectItem key={m.value} value={m.value}>
                            <span className="flex items-center gap-2">
                              <m.icon className="h-3 w-3" /> {m.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAddPayment} disabled={paying || !activeShift}>
                      {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pay'}
                    </Button>
                  </div>
                )}
                {!activeShift && !isFullyPaid && (
                  <p className="text-xs text-orange-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Open a shift to record payments
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOrder(null)}>Close</Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={updating || !selectedOrder || newStatus === selectedOrder.status}
            >
              {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}