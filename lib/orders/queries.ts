import 'server-only';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase/server';
import type { PlaceOrderRequest } from '@/lib/schemas/order';
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
