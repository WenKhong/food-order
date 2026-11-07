import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateText } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { z } from 'zod';
import { MenuItem } from '@/lib/schemas/menu';
import type { OrderLine } from '@/lib/schemas/order';
import { createTools, type ChatTools } from './tools';

// The tools run exactly as in the app: a fake model asks for a tool call, and
// the real AI SDK validates the input with the tool's zod schema and runs it.
// No network, no API key, no database (the real menu.json stands in for it).
const menu = z.array(MenuItem).parse(JSON.parse(readFileSync('data/menu.json', 'utf8')));
// One known order, by its short number (what the order page shows as "#92F7354A").
const orders = new Map([
  ['92f7354a', { status: 'preparing' as const, fulfilment: 'pickup' as const, created_at: '2026-11-06T14:13:00Z' }],
]);
const tools = (cart: OrderLine[] = []) =>
  createTools({
    cart,
    loadMenu: async () => menu,
    findOrder: async (orderNumber) => orders.get(orderNumber.replace(/^#/, '').toLowerCase()) ?? null,
  });

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

async function call(toolSet: ChatTools, toolName: keyof ChatTools, input: unknown) {
  const model = new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: 'tool-call', toolCallId: 'call-1', toolName, input: JSON.stringify(input) }],
      finishReason: { unified: 'tool-calls', raw: undefined },
      usage,
      warnings: [],
    }),
  });
  const result = await generateText({ model, tools: toolSet, prompt: 'test' });
  const part = result.content.find((p) => p.type === 'tool-result' || p.type === 'tool-error');
  if (part?.type === 'tool-error') return { rejected: true };
  return part?.type === 'tool-result' ? part.output : undefined;
}

test('the assistant has exactly these six tools, and none of them places an order', () => {
  assert.deepEqual(Object.keys(tools()).sort(), [
    'add_to_cart',
    'get_item',
    'get_order_status',
    'go_to_checkout',
    'search_menu',
    'view_cart',
  ]);
});

test('search_menu returns database facts with the price already formatted', async () => {
  const output = await call(tools(), 'search_menu', { query: 'margherita' });
  assert.deepEqual(output, {
    count: 1,
    items: [
      {
        id: 'margherita',
        name: 'Margherita',
        category: 'pizza',
        description: 'Tomato sauce, mozzarella, fresh basil. Regular 10-inch.',
        price: 'RM 22.90',
        available: true,
        spice_level: 0,
        halal: true,
        allergens: ['gluten', 'dairy'],
        tags: ['vegetarian', 'classic'],
      },
    ],
  });
});

test('get_item: unknown ids are reported as not found', async () => {
  assert.deepEqual(await call(tools(), 'get_item', { id: 'sushi' }), { found: false });
});

test('add_to_cart uses the menu price; a price sent by the model is ignored', async () => {
  const output = await call(tools(), 'add_to_cart', { menu_item_id: 'margherita', qty: 2, price_cents: 1 });
  assert.deepEqual(output, {
    ok: true,
    added: '2 × Margherita',
    price_each: 'RM 22.90',
    action: { type: 'add_to_cart', item: { id: 'margherita', name: 'Margherita', price_cents: 2290 }, qty: 2 },
  });
});

test('add_to_cart refuses sold-out items and items not on the menu', async () => {
  assert.deepEqual(await call(tools(), 'add_to_cart', { menu_item_id: 'truffle-mushroom', qty: 1 }), {
    ok: false,
    reason: 'sold_out',
    name: 'Truffle Mushroom',
  });
  assert.deepEqual(await call(tools(), 'add_to_cart', { menu_item_id: 'sushi', qty: 1 }), {
    ok: false,
    reason: 'not_on_menu',
  });
});

test('add_to_cart counts what is already in the cart against the 20-per-item limit', async () => {
  const output = await call(tools([{ menu_item_id: 'margherita', qty: 19 }]), 'add_to_cart', {
    menu_item_id: 'margherita',
    qty: 2,
  });
  assert.deepEqual(output, { ok: false, reason: 'quantity_limit', name: 'Margherita', in_cart: 19, max: 20 });
});

test('out-of-range input is rejected by the schema before the tool runs', async () => {
  assert.deepEqual(await call(tools(), 'add_to_cart', { menu_item_id: 'margherita', qty: 50 }), { rejected: true });
  assert.deepEqual(await call(tools(), 'add_to_cart', { menu_item_id: 'Margherita!', qty: 1 }), { rejected: true });
});

test('view_cart prices the cart from the menu and flags sold-out lines', async () => {
  const output = await call(
    tools([
      { menu_item_id: 'margherita', qty: 2 },
      { menu_item_id: 'truffle-mushroom', qty: 1 },
    ]),
    'view_cart',
    {},
  );
  assert.deepEqual(output, {
    empty: false,
    lines: [{ name: 'Margherita', qty: 2, price_each: 'RM 22.90', line_total: 'RM 45.80', notes: null }],
    subtotal: 'RM 45.80',
    unavailable: ['Truffle Mushroom'],
    note: 'The final total is confirmed at checkout.',
  });
});

test('an item added earlier in the same reply shows up in view_cart', async () => {
  const sameRequest = tools();
  await call(sameRequest, 'add_to_cart', { menu_item_id: 'coca-cola', qty: 1 });
  const output = (await call(sameRequest, 'view_cart', {})) as { subtotal: string };
  assert.equal(output.subtotal, 'RM 4.50');
});

test('get_order_status returns only the status and time, in Malaysia time', async () => {
  // Exactly these fields: no name, phone, address, items, total or order link.
  assert.deepEqual(await call(tools(), 'get_order_status', { order_number: '#92f7354a' }), {
    found: true,
    number: '#92F7354A',
    status: 'Preparing',
    message: 'Our kitchen is preparing your order.',
    placed: '6 Nov 2026, 10:13 pm',
  });
});

test('get_order_status: unknown numbers are reported as not found', async () => {
  assert.deepEqual(await call(tools(), 'get_order_status', { order_number: 'ABCDEF12' }), {
    found: false,
    number: '#ABCDEF12',
  });
});

test('get_order_status only accepts an order number, not e.g. a phone number', async () => {
  assert.deepEqual(await call(tools(), 'get_order_status', { order_number: '012-345 6789' }), { rejected: true });
  assert.deepEqual(await call(tools(), 'get_order_status', { order_number: 'my last order' }), { rejected: true });
});

test('go_to_checkout needs something in the cart, and only navigates', async () => {
  assert.deepEqual(await call(tools(), 'go_to_checkout', {}), { ok: false, reason: 'empty_cart' });
  assert.deepEqual(await call(tools([{ menu_item_id: 'margherita', qty: 1 }]), 'go_to_checkout', {}), {
    ok: true,
    action: { type: 'go_to_checkout' },
  });
});
