import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import {
  addItem,
  itemCount,
  MAX_QTY,
  parseCart,
  removeItem,
  setNotes,
  setQty,
  subtotalCents,
  toOrderLines,
  type Cart,
} from './cart';
import { OrderLine } from './schemas/order';

const margherita = { id: 'margherita', name: 'Margherita', price_cents: 2290 };
const cola = { id: 'coca-cola', name: 'Coca-Cola (can)', price_cents: 450 };

test('addItem adds a new line with quantity 1 by default', () => {
  assert.deepEqual(addItem([], margherita), [{ ...margherita, qty: 1 }]);
});

test('adding an item that is already in the cart merges the quantity', () => {
  const cart = addItem(addItem([], margherita), margherita, 2);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].qty, 3);
});

test(`quantities are capped at ${MAX_QTY}`, () => {
  const cart = addItem([], margherita, 25);
  assert.equal(cart[0].qty, MAX_QTY);
  assert.equal(addItem(cart, margherita)[0].qty, MAX_QTY);
  assert.equal(setQty(cart, 'margherita', 99)[0].qty, MAX_QTY);
});

test('setQty never goes below 1 (removing is a separate action)', () => {
  const cart = addItem([], margherita, 2);
  assert.equal(setQty(cart, 'margherita', 0)[0].qty, 1);
  assert.equal(setQty(cart, 'margherita', -3)[0].qty, 1);
});

test('helpers return a new cart and leave the one they were given untouched', () => {
  const before: Cart = addItem([], margherita);
  const copy = structuredClone(before);
  addItem(before, margherita);
  setQty(before, 'margherita', 5);
  setNotes(before, 'margherita', 'extra basil');
  removeItem(before, 'margherita');
  assert.deepEqual(before, copy);
});

test('removeItem removes only that line', () => {
  const cart = addItem(addItem([], margherita), cola);
  assert.deepEqual(
    removeItem(cart, 'margherita').map((line) => line.id),
    ['coca-cola'],
  );
});

test('subtotal and item count are whole numbers of cents and items', () => {
  const cart = addItem(addItem([], margherita, 2), cola, 3);
  assert.equal(subtotalCents(cart), 5930); // 2 x 22.90 + 3 x 4.50
  assert.equal(itemCount(cart), 5);
  assert.equal(subtotalCents([]), 0);
});

test('order lines carry only id, quantity and trimmed notes, never the name or price', () => {
  let cart = addItem(addItem([], margherita, 2), cola);
  cart = setNotes(cart, 'margherita', '  extra basil  ');
  cart = setNotes(cart, 'coca-cola', '   ');
  const lines = toOrderLines(cart);
  assert.deepEqual(lines, [
    { menu_item_id: 'margherita', qty: 2, notes: 'extra basil' },
    { menu_item_id: 'coca-cola', qty: 1 },
  ]);
  // ...and they are exactly what POST /api/orders accepts.
  assert.doesNotThrow(() => z.array(OrderLine).parse(lines));
});

test('parseCart turns unreadable or invalid saved data into an empty cart', () => {
  assert.deepEqual(parseCart(null), []);
  assert.deepEqual(parseCart('not json'), []);
  assert.deepEqual(parseCart('{"id":"margherita"}'), []);
  assert.deepEqual(parseCart(JSON.stringify([{ ...margherita, qty: 0 }])), []);

  const saved = addItem([], margherita, 2);
  assert.deepEqual(parseCart(JSON.stringify(saved)), saved);
});
