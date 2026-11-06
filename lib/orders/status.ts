import type { Fulfilment, OrderStatus } from '@/lib/schemas/order';

// Customer-facing words for each status (the database stores the plain values).
export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Received',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// The normal path through an order, shown as progress steps.
export const STATUS_STEPS: OrderStatus[] = ['pending', 'preparing', 'ready', 'completed'];

// No more changes are expected, so the order page stops checking for updates.
export function isFinished(status: OrderStatus) {
  return status === 'completed' || status === 'cancelled';
}

export function statusMessage(status: OrderStatus, fulfilment: Fulfilment): string {
  switch (status) {
    case 'pending':
      return "We've received your order and will start on it shortly.";
    case 'preparing':
      return 'Our kitchen is preparing your order.';
    case 'ready':
      return fulfilment === 'pickup'
        ? 'Your order is ready. Come and collect it at the counter.'
        : 'Your order is ready and will be on its way shortly.';
    case 'completed':
      return 'Your order is complete. Enjoy your meal!';
    case 'cancelled':
      return 'This order was cancelled.';
  }
}
