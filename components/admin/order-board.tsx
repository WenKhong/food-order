import { cn } from 'cn';
import { logout } from '@/app/admin/actions';
import { AutoRefresh } from '@/components/orders/auto-refresh';
import { badgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatRM } from '@/lib/money';
import { formatOrderTime, orderNumber } from '@/lib/orders/format';
import type { AdminOrder } from '@/lib/orders/queries';
import { isFinished, STATUS_LABELS } from '@/lib/orders/status';
import type { OrderStatus } from '@/lib/schemas/order';

// New orders stand out (dark badge); cancelled ones read as a warning.
const STATUS_BADGE: Record<OrderStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'default',
  preparing: 'secondary',
  ready: 'outline',
  completed: 'secondary',
  cancelled: 'destructive',
};

export function OrderBoard({ orders }: { orders: AdminOrder[] }) {
  const active = orders.filter((order) => !isFinished(order.status));
  const finished = orders.filter((order) => isFinished(order.status));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">Newest first. This page checks for new orders every 15 seconds.</p>
        </div>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>

      <OrderSection title="Active" orders={active} empty="No active orders right now." />
      <OrderSection title="Finished" orders={finished} empty="Nothing finished yet." />

      <AutoRefresh everyMs={15_000} />
    </div>
  );
}

function OrderSection({ title, orders, empty }: { title: string; orders: AdminOrder[]; empty: string }) {
  return (
    <section aria-label={`${title} orders`} className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">
        {title} <span className="text-muted-foreground">({orders.length})</span>
      </h2>
      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {orders.map((order) => (
            <li key={order.id}>
              <OrderCard order={order} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function OrderCard({ order }: { order: AdminOrder }) {
  return (
    <Card size="sm" className="h-full" data-order-id={order.id}>
      <CardHeader>
        <CardTitle>
          {orderNumber(order.id)} · {order.customer_name}
        </CardTitle>
        <CardDescription>
          {formatOrderTime(order.created_at)} · {order.fulfilment === 'pickup' ? 'Pickup' : 'Delivery'}
        </CardDescription>
        <CardAction>
          <span className={cn(badgeVariants({ variant: STATUS_BADGE[order.status] }))}>
            {STATUS_LABELS[order.status]}
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="flex flex-col gap-0.5">
          <a href={`tel:${order.phone}`} className="w-fit underline underline-offset-4">
            {order.phone}
          </a>
          {order.address && <p className="text-muted-foreground">{order.address}</p>}
        </div>
        <ul className="flex flex-col gap-1">
          {order.order_items.map((item) => (
            <li key={item.id}>
              {item.qty} × {item.menu_items.name}
              {item.notes && <span className="block text-xs text-muted-foreground">Note: {item.notes}</span>}
            </li>
          ))}
        </ul>
        <p className="font-medium tabular-nums">Total {formatRM(order.total_cents)}</p>
      </CardContent>
    </Card>
  );
}
