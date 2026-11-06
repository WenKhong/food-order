import { z } from 'zod';
import { ItemId } from '@/lib/schemas/menu';
import type { OrderLine } from '@/lib/schemas/order';

// The cart lives in the browser. These functions are pure: they never change
// the cart they're given, they return a new one (which is how React notices a
// change), and they have no browser or React code, so they're easy to test.

// Same limit as the order_items.qty check in the database.
export const MAX_QTY = 20;

// One cart line. name and price_cents are copies for display only: the server
// ignores them and prices every order from the database.
export const CartLine = z.object({
  id: ItemId,
  name: z.string().min(1).max(100),
  price_cents: z.number().int().positive(),
  qty: z.number().int().min(1).max(MAX_QTY),
  notes: z.string().max(200).optional(),
});
export type CartLine = z.infer<typeof CartLine>;

export const Cart = z.array(CartLine).max(30);
export type Cart = CartLine[];

// What the menu passes in when an item is added.
export type CartItem = Pick<CartLine, 'id' | 'name' | 'price_cents'>;

function clampQty(qty: number) {
  if (!Number.isFinite(qty)) return 1;
  return Math.min(MAX_QTY, Math.max(1, Math.trunc(qty)));
}

// Adds an item. If it's already in the cart, the quantities merge (capped at
// MAX_QTY) instead of creating a second line, and the display copies of the
// name and price are refreshed.
export function addItem(cart: Cart, item: CartItem, qty = 1, notes?: string): Cart {
  if (cart.some((line) => line.id === item.id)) {
    return cart.map((line) =>
      line.id === item.id
        ? {
            ...line,
            name: item.name,
            price_cents: item.price_cents,
            qty: clampQty(line.qty + qty),
            notes: notes ?? line.notes,
          }
        : line,
    );
  }
  const line: CartLine = { id: item.id, name: item.name, price_cents: item.price_cents, qty: clampQty(qty) };
  if (notes) line.notes = notes;
  return [...cart, line];
}

// Quantity stays between 1 and MAX_QTY. Removing a line is a separate action.
export function setQty(cart: Cart, id: string, qty: number): Cart {
  return cart.map((line) => (line.id === id ? { ...line, qty: clampQty(qty) } : line));
}

export function setNotes(cart: Cart, id: string, notes: string): Cart {
  return cart.map((line) => (line.id === id ? { ...line, notes: notes.slice(0, 200) } : line));
}

export function removeItem(cart: Cart, id: string): Cart {
  return cart.filter((line) => line.id !== id);
}

export function subtotalCents(cart: Cart): number {
  return cart.reduce((sum, line) => sum + line.price_cents * line.qty, 0);
}

export function itemCount(cart: Cart): number {
  return cart.reduce((sum, line) => sum + line.qty, 0);
}

// What the browser sends when placing an order: ids, quantities and notes.
// Never the name or the price.
export function toOrderLines(cart: Cart): OrderLine[] {
  return cart.map((line) => {
    const notes = line.notes?.trim();
    return notes
      ? { menu_item_id: line.id, qty: line.qty, notes }
      : { menu_item_id: line.id, qty: line.qty };
  });
}

// Reads a cart saved as JSON. Anything unreadable or invalid (an old format, a
// hand-edited value) becomes an empty cart instead of breaking the page.
export function parseCart(raw: string | null): Cart {
  if (!raw) return [];
  try {
    const result = Cart.safeParse(JSON.parse(raw));
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}
