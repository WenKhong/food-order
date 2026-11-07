import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { MenuItem } from '@/lib/schemas/menu';
import { searchMenu } from './search';

// The real menu, so these tests also pin down what the assistant will find.
const menu = z.array(MenuItem).parse(JSON.parse(readFileSync('data/menu.json', 'utf8')));
const ids = (search: Parameters<typeof searchMenu>[1]) => searchMenu(menu, search).map((item) => item.id);

test('no filters returns the whole menu', () => {
  assert.equal(searchMenu(menu, {}).length, 24);
});

test('keywords match name, description and category, case-insensitively', () => {
  assert.deepEqual(ids({ query: 'MARGHERITA' }), ['margherita']);
  assert.equal(ids({ query: 'chicken' }).length, 6);
  assert.deepEqual(ids({ query: 'chicken pizza' }).sort(), ['bbq-chicken', 'hawaiian-chicken']);
});

test('a plural finds the singular', () => {
  assert.deepEqual(ids({ query: 'pizzas' }), ids({ query: 'pizza' }));
  assert.ok(ids({ query: 'prawns' }).includes('sambal-prawn'));
});

test('unknown things find nothing (so the assistant can say so)', () => {
  assert.deepEqual(ids({ query: 'sushi' }), []);
});

test('under RM5 means only the two cheap drinks', () => {
  assert.deepEqual(ids({ max_price_cents: 500 }).sort(), ['coca-cola', 'mineral-water']);
});

test('not spicy leaves out all 6 spicy items', () => {
  const notSpicy = searchMenu(menu, { max_spice_level: 0 });
  assert.equal(notSpicy.length, 18);
  assert.ok(notSpicy.every((item) => item.spicy_level === 0));
});

test('vegetarian, alone and with a category', () => {
  assert.equal(ids({ vegetarian_only: true }).length, 6);
  assert.deepEqual(ids({ vegetarian_only: true, category: 'pizza' }).sort(), [
    'four-cheese',
    'margherita',
    'truffle-mushroom',
    'veggie-supreme',
  ]);
});

test('excluding seafood and fish removes the prawn, marinara and Caesar items', () => {
  const safe = ids({ exclude_allergens: ['seafood', 'fish'] });
  assert.equal(safe.length, 21);
  for (const id of ['sambal-prawn', 'seafood-marinara', 'caesar-salad']) assert.ok(!safe.includes(id), id);
});

test('sold-out items are still found', () => {
  const [truffle] = searchMenu(menu, { query: 'truffle' });
  assert.equal(truffle.id, 'truffle-mushroom');
  assert.equal(truffle.is_available, false);
});
