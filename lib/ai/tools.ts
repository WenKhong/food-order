import { tool } from 'ai';
import { z } from 'zod';
import { MAX_QTY } from '@/lib/cart';
import { searchMenu } from '@/lib/menu/search';
import { formatRM } from '@/lib/money';
import { formatOrderTime } from '@/lib/orders/format';
import { STATUS_LABELS, statusMessage } from '@/lib/orders/status';
import { Category, ItemId, type MenuItem } from '@/lib/schemas/menu';
import type { Fulfilment, OrderLine, OrderStatus } from '@/lib/schemas/order';

// The assistant's tools. The SDK checks every tool input against its zod
// schema before `execute` runs, so a malformed call never reaches our code.
// There is deliberately no tool that places an order: only the customer's own
// click on "Place order" does that.

type ToolDeps = {
  cart: OrderLine[]; // the browser's cart: ids, quantities and notes, never prices
  loadMenu: () => Promise<MenuItem[]>; // getMenu() in the app, a fixed list in tests
  // getOrderStatusByNumber() in the app: status, pickup/delivery and time only
  findOrder: (orderNumber: string) => Promise<{ status: OrderStatus; fulfilment: Fulfilment; created_at: string } | null>;
};

// What add_to_cart asks the browser to do (the cart lives there, not on the server).
export type AddToCartAction = {
  type: 'add_to_cart';
  item: { id: string; name: string; price_cents: number };
  qty: number;
  notes?: string;
};

// What the model sees about an item: facts straight from the database, with
// the price already formatted so the model never has to do maths on it.
function describeItem(item: MenuItem) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    description: item.description ?? null,
    price: formatRM(item.price_cents),
    available: item.is_available,
    spice_level: item.spicy_level,
    halal: item.is_halal,
    allergens: item.allergens,
    tags: item.tags,
  };
}

export function createTools({ cart, loadMenu, findOrder }: ToolDeps) {
  // One database read per chat request, shared by every tool call in it.
  let menu: Promise<MenuItem[]> | undefined;
  const getMenu = () => (menu ??= loadMenu());
  const findItem = async (id: string) => (await getMenu()).find((item) => item.id === id);

  // A copy of the browser's cart that add_to_cart updates, so a view_cart or
  // go_to_checkout later in the same reply already sees the new items.
  const workingCart: OrderLine[] = cart.map((line) => ({ ...line }));

  return {
    search_menu: tool({
      description:
        'Search the menu. Use English keywords (translate if the customer writes in Malay or Chinese) and/or filters. ' +
        'Returns matching items with price, availability, spice level (0 = not spicy, 3 = very spicy), halal flag, ' +
        'allergens and tags. Use this before recommending or mentioning any item.',
      inputSchema: z.object({
        query: z.string().max(100).optional().describe('English keywords, e.g. "chicken", "pasta", "cheese"'),
        category: Category.optional(),
        max_price_cents: z.number().int().positive().max(100_000).optional().describe('e.g. 500 for RM5'),
        max_spice_level: z.number().int().min(0).max(3).optional().describe('0 for not spicy'),
        vegetarian_only: z.boolean().optional(),
        exclude_allergens: z.array(z.string().max(30)).max(10).optional().describe('e.g. ["seafood", "fish"]'),
      }),
      execute: async (search) => {
        const items = searchMenu(await getMenu(), search).map(describeItem);
        return { count: items.length, items };
      },
    }),

    get_item: tool({
      description: 'Get one menu item by its id (ids come from search_menu).',
      inputSchema: z.object({ id: ItemId }),
      execute: async ({ id }) => {
        const item = await findItem(id);
        return item ? { found: true as const, item: describeItem(item) } : { found: false as const };
      },
    }),

    add_to_cart: tool({
      description:
        "Add an item to the customer's cart. Only use this when the customer clearly asks. " +
        'There is no price field: the price always comes from the menu.',
      inputSchema: z.object({
        menu_item_id: ItemId,
        qty: z.number().int().min(1).max(MAX_QTY),
        notes: z.string().trim().max(200).optional().describe('e.g. "no onions"'),
      }),
      execute: async ({ menu_item_id, qty, notes }) => {
        const item = await findItem(menu_item_id);
        if (!item) return { ok: false as const, reason: 'not_on_menu' as const };
        if (!item.is_available) return { ok: false as const, reason: 'sold_out' as const, name: item.name };

        const line = workingCart.find((existing) => existing.menu_item_id === menu_item_id);
        const inCart = line?.qty ?? 0;
        if (inCart + qty > MAX_QTY) {
          return { ok: false as const, reason: 'quantity_limit' as const, name: item.name, in_cart: inCart, max: MAX_QTY };
        }
        if (line) {
          line.qty += qty;
          if (notes) line.notes = notes;
        } else {
          workingCart.push(notes ? { menu_item_id, qty, notes } : { menu_item_id, qty });
        }

        // The cart lives in the browser, so the chat widget applies this action.
        const action: AddToCartAction = {
          type: 'add_to_cart',
          item: { id: item.id, name: item.name, price_cents: item.price_cents },
          qty,
        };
        if (notes) action.notes = notes;
        return { ok: true as const, added: `${qty} × ${item.name}`, price_each: formatRM(item.price_cents), action };
      },
    }),

    view_cart: tool({
      description: "Show what is in the customer's cart, priced from the current menu.",
      inputSchema: z.object({}),
      execute: async () => {
        const menuById = new Map((await getMenu()).map((item) => [item.id, item]));
        const lines = [];
        const unavailable = [];
        let subtotalCents = 0;
        for (const line of workingCart) {
          const item = menuById.get(line.menu_item_id);
          if (!item) continue; // no longer on the menu
          if (!item.is_available) {
            unavailable.push(item.name);
            continue;
          }
          subtotalCents += item.price_cents * line.qty;
          lines.push({
            name: item.name,
            qty: line.qty,
            price_each: formatRM(item.price_cents),
            line_total: formatRM(item.price_cents * line.qty),
            notes: line.notes ?? null,
          });
        }
        return {
          empty: lines.length === 0,
          lines,
          subtotal: formatRM(subtotalCents),
          unavailable,
          note: 'The final total is confirmed at checkout.',
        };
      },
    }),

    go_to_checkout: tool({
      description:
        'Take the customer to the checkout page when they are ready to order. This does not place the order: ' +
        'the customer reviews it there and confirms it themselves.',
      inputSchema: z.object({}),
      execute: async () => {
        if (workingCart.length === 0) return { ok: false as const, reason: 'empty_cart' as const };
        return { ok: true as const, action: { type: 'go_to_checkout' as const } };
      },
    }),

    get_order_status: tool({
      description:
        'Look up a placed order by the order number shown on its order page, e.g. "#92F7354A". Returns only its ' +
        'status and when it was placed. Customers can always see live status on their order page; the restaurant ' +
        'does not send emails or SMS.',
      inputSchema: z.object({
        order_number: z
          .string()
          .trim()
          .regex(/^#?[0-9a-fA-F]{8}$/, 'An order number looks like #92F7354A'),
      }),
      execute: async ({ order_number }) => {
        const number = `#${order_number.replace(/^#/, '').toUpperCase()}`;
        const order = await findOrder(order_number);
        if (!order) return { found: false as const, number };
        return {
          found: true as const,
          number,
          status: STATUS_LABELS[order.status],
          message: statusMessage(order.status, order.fulfilment),
          placed: formatOrderTime(order.created_at),
        };
      },
    }),
  };
}

export type ChatTools = ReturnType<typeof createTools>;
