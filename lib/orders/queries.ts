import 'server-only';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase/server';
import { Fulfilment, OrderStatus, type PlaceOrderRequest } from '@/lib/schemas/order';
import { orderRejection, type OrderRejection } from './errors';

export type PlaceOrderResult = { ok: true; id: string } | ({ ok: false } & OrderRejection);

// Calls the place_order() database function. It looks up every price itself,
// checks each item is available, and writes the order and its items in one
// transaction. We pass only ids, quantities and notes: never a price or a total.
export async function placeOrder(order: PlaceOrderRequest): Promise<PlaceOrderResult> {
  const { data, error } = await getSupabase().rpc('place_order', {
    p_customer_name: order.customer_name,
    p_phone: order.phone,
    p_fulfilment: order.fulfilment,
    // An address typed before switching to pickup is ignored.
    p_address: order.fulfilment === 'delivery' ? (order.address ?? null) : null,
    p_items: order.items.map((line) => ({
      menu_item_id: line.menu_item_id,
      qty: line.qty,
      notes: line.notes || null,
    })),
  });

  if (error) {
    const rejection = orderRejection(error);
    if (rejection) return { ok: false, ...rejection };
    throw new Error(`place_order failed (${error.code}): ${error.message}`);
  }
  return { ok: true, id: z.uuid().parse(data) };
}

// What anyone holding the order link may see. Deliberately no phone or address:
// the link is the only "key", so it should reveal as little as possible.
const PublicOrder = z.object({
  id: z.uuid(),
  customer_name: z.string(),
  fulfilment: Fulfilment,
  status: OrderStatus,
  total_cents: z.number().int(),
  created_at: z.string(),
  order_items: z.array(
    z.object({
      id: z.number().int(),
      qty: z.number().int(),
      unit_price_cents: z.number().int(), // the price when the order was placed
      notes: z.string().nullable(),
      menu_items: z.object({ name: z.string() }),
    }),
  ),
});
export type PublicOrder = z.infer<typeof PublicOrder>;

export async function getOrder(id: string): Promise<PublicOrder | null> {
  const { data, error } = await getSupabase()
    .from('orders')
    .select(
      'id, customer_name, fulfilment, status, total_cents, created_at, ' +
        'order_items(id, qty, unit_price_cents, notes, menu_items(name))',
    )
    .eq('id', id)
    .order('id', { referencedTable: 'order_items' }) // items in the order they were added
    .maybeSingle();
  if (error) {
    throw new Error(`Could not load order: ${error.message}`);
  }
  return data ? PublicOrder.parse(data) : null;
}
