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

// Where an order may go next. Staff move it one step forward, or cancel it
// before it's completed. Finished orders never change.
const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function nextStatuses(status: OrderStatus): OrderStatus[] {
  return NEXT_STATUSES[status];
}

// Checked on the server for every change, whatever the browser sent.
export function canMoveTo(from: OrderStatus, to: OrderStatus): boolean {
  return NEXT_STATUSES[from].includes(to);
}

// Admin button text for moving an order to each status ("pending" is never offered).
export const ACTION_LABELS: Record<OrderStatus, string> = {
  pending: 'Mark received',
  preparing: 'Start preparing',
  ready: 'Mark ready',
  completed: 'Complete',
  cancelled: 'Cancel order',
};

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
