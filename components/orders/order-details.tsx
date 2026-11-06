import { CheckIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import { cn } from 'cn';
import { z } from 'zod';
import { badgeVariants } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRM } from '@/lib/money';
import { formatOrderTime, orderNumber } from '@/lib/orders/format';
import { getOrder } from '@/lib/orders/queries';
import { isFinished, STATUS_LABELS, STATUS_STEPS, statusMessage } from '@/lib/orders/status';
import type { OrderStatus } from '@/lib/schemas/order';
import { AutoRefresh } from './auto-refresh';

export async function OrderDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // A malformed id can't be an order: skip the database and show "not found".
  if (!z.uuid().safeParse(id).success) notFound();

  const order = await getOrder(id);
  if (!order) notFound();

  const firstName = order.customer_name.split(' ')[0];
  const cancelled = order.status === 'cancelled';

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          Order {orderNumber(order.id)} · {formatOrderTime(order.created_at)}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Thanks, {firstName}!</h1>
        {/* aria-live: screen readers announce the new status after an auto-refresh */}
        <p aria-live="polite" className="text-muted-foreground">
          {statusMessage(order.status, order.fulfilment)}
        </p>
      </header>

      {cancelled ? (
        <span className={cn(badgeVariants({ variant: 'destructive' }))}>{STATUS_LABELS.cancelled}</span>
      ) : (
        <StatusSteps status={order.status} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>{order.fulfilment === 'pickup' ? 'Pickup order' : 'Delivery order'}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {order.order_items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 py-2">
                <div>
                  <p>
                    {item.qty} × {item.menu_items.name}
                  </p>
                  {item.notes && <p className="text-xs text-muted-foreground">Note: {item.notes}</p>}
                </div>
                <p className="tabular-nums">{formatRM(item.unit_price_cents * item.qty)}</p>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter className="justify-between font-medium">
          <span>Total</span>
          <span className="tabular-nums">{formatRM(order.total_cents)}</span>
        </CardFooter>
      </Card>

      <p className="text-sm text-muted-foreground">
        {order.fulfilment === 'pickup' ? 'Pay when you collect your order.' : 'Pay on delivery.'} Keep this
        page open or bookmark it: the status updates by itself.
      </p>

      {!isFinished(order.status) && <AutoRefresh everyMs={15_000} />}
    </div>
  );
}

function StatusSteps({ status }: { status: OrderStatus }) {
  const current = STATUS_STEPS.indexOf(status);
  return (
    <ol aria-label="Order progress" className="grid grid-cols-4 gap-2">
      {STATUS_STEPS.map((step, index) => {
        const reached = index <= current;
        return (
          <li
            key={step}
            aria-current={index === current ? 'step' : undefined}
            className="flex flex-col items-center gap-1 text-center"
          >
            <span
              className={cn(
                'flex size-7 items-center justify-center rounded-full border text-xs',
                reached ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              {reached ? <CheckIcon aria-hidden="true" className="size-4" /> : index + 1}
            </span>
            <span className={cn('text-xs', reached ? 'font-medium' : 'text-muted-foreground')}>
              {STATUS_LABELS[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
