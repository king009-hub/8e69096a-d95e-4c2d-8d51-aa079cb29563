import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useActiveOrders, useUpdateOrderStatus, useUpdateOrderItemStatus, OrderStatus } from '@/hooks/useHotelOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Clock,
  ChefHat,
  CheckCircle2,
  XCircle,
  BedDouble,
  User,
  MessageSquare,
  RefreshCw,
  Bell,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'New', color: 'bg-yellow-500', icon: Clock },
  preparing: { label: 'Preparing', color: 'bg-blue-500', icon: ChefHat },
  ready: { label: 'Ready', color: 'bg-green-500', icon: CheckCircle2 },
  served: { label: 'Served', color: 'bg-muted', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-destructive', icon: XCircle },
};

export default function KitchenDisplay() {
  const { data: orders = [], isLoading, refetch } = useActiveOrders();
  const updateOrderStatus = useUpdateOrderStatus();
  const updateItemStatus = useUpdateOrderItemStatus();
  const [readyNotified, setReadyNotified] = useState<Set<string>>(new Set());

  // Sound notification when new order arrives
  useEffect(() => {
    const pendingOrders = orders.filter(o => o.status === 'pending');
    if (pendingOrders.length > 0) {
      const newOrders = pendingOrders.filter(o => !readyNotified.has(o.id));
      if (newOrders.length > 0) {
        // Browser notification
        if (Notification.permission === 'granted') {
          new Notification('New Order!', {
            body: `${newOrders.length} new order(s) received`,
            icon: '/favicon.ico',
          });
        }
        setReadyNotified(prev => {
          const next = new Set(prev);
          newOrders.forEach(o => next.add(o.id));
          return next;
        });
      }
    }
  }, [orders]);

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleStatusChange = (orderId: string, status: OrderStatus) => {
    updateOrderStatus.mutate({ orderId, status });
  };

  const handleItemReady = (itemId: string) => {
    updateItemStatus.mutate({ itemId, status: 'ready' });
  };

  // Group orders by status
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');

  return (
    <Layout>
      <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ChefHat className="h-6 w-6" />
            Kitchen Display
          </h1>
          <div className="flex items-center gap-3">
            <Badge variant="destructive" className="text-sm px-3 py-1">
              {pendingOrders.length} New
            </Badge>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {preparingOrders.length} Preparing
            </Badge>
            <Badge className="text-sm px-3 py-1 bg-green-600">
              {readyOrders.length} Ready
            </Badge>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Orders Grid */}
        <ScrollArea className="flex-1">
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders
              .filter(o => ['pending', 'preparing', 'ready'].includes(o.status))
              .sort((a, b) => {
                const priority: Record<string, number> = { pending: 0, preparing: 1, ready: 2 };
                return (priority[a.status] ?? 3) - (priority[b.status] ?? 3);
              })
              .map(order => {
                const config = statusConfig[order.status] || statusConfig.pending;
                const StatusIcon = config.icon;
                const timeAgo = formatDistanceToNow(new Date(order.created_at), { addSuffix: true });

                return (
                  <Card key={order.id} className={`border-2 ${
                    order.status === 'pending' ? 'border-yellow-500 animate-pulse-slow' :
                    order.status === 'preparing' ? 'border-blue-500' :
                    order.status === 'ready' ? 'border-green-500' : 'border-border'
                  }`}>
                    <CardHeader className="pb-2 pt-3 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{order.order_number}</CardTitle>
                        <Badge className={`${config.color} text-white`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeAgo}
                        </span>
                        {order.room && (
                          <span className="flex items-center gap-1">
                            <BedDouble className="h-3 w-3" />
                            Room {order.room.room_number}
                          </span>
                        )}
                        {order.table_number && (
                          <span>Table {order.table_number}</span>
                        )}
                      </div>
                      {order.waiter && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {order.waiter.first_name} {order.waiter.last_name}
                        </div>
                      )}
                    </CardHeader>

                    <Separator />

                    <CardContent className="pt-3 px-4 pb-3">
                      {/* Order Items */}
                      <div className="space-y-2 mb-3">
                        {order.items?.map(item => (
                          <div key={item.id} className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">{item.quantity}×</span>
                                <span className={`font-medium ${item.status === 'ready' ? 'line-through text-muted-foreground' : ''}`}>
                                  {item.name}
                                </span>
                              </div>
                              {item.notes && (
                                <div className="flex items-center gap-1 text-xs text-orange-600 mt-0.5">
                                  <MessageSquare className="h-3 w-3" />
                                  {item.notes}
                                </div>
                              )}
                            </div>
                            {order.status === 'preparing' && item.status !== 'ready' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="shrink-0 text-green-600 border-green-600 hover:bg-green-50"
                                onClick={() => handleItemReady(item.id)}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Done
                              </Button>
                            )}
                            {item.status === 'ready' && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                ✓
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>

                      {order.notes && (
                        <div className="text-sm bg-muted p-2 rounded mb-3">
                          <strong>Note:</strong> {order.notes}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {order.status === 'pending' && (
                          <>
                            <Button
                              className="flex-1"
                              onClick={() => handleStatusChange(order.id, 'preparing')}
                            >
                              <ChefHat className="h-4 w-4 mr-1" />
                              Start Preparing
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => handleStatusChange(order.id, 'cancelled')}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {order.status === 'preparing' && (
                          <Button
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => handleStatusChange(order.id, 'ready')}
                          >
                            <Bell className="h-4 w-4 mr-1" />
                            Mark All Ready
                          </Button>
                        )}
                        {order.status === 'ready' && (
                          <Button
                            className="flex-1"
                            variant="outline"
                            onClick={() => handleStatusChange(order.id, 'served')}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Mark Served
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

            {orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status)).length === 0 && (
              <div className="col-span-full text-center py-20 text-muted-foreground">
                <ChefHat className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">No active orders</p>
                <p className="text-sm">Waiting for new orders from waiters...</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </Layout>
  );
}
