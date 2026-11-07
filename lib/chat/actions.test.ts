import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chatActions } from './actions';
import type { ChatMessage } from './types';

const margherita = { id: 'margherita', name: 'Margherita', price_cents: 2290 };

// An assistant reply as useChat holds it, with tool parts in different states.
const reply: ChatMessage = {
  id: 'reply-1',
  role: 'assistant',
  parts: [
    { type: 'step-start' },
    {
      type: 'tool-search_menu',
      toolCallId: 'search-1',
      state: 'output-available',
      input: { query: 'margherita' },
      output: { count: 0, items: [] },
    },
    {
      type: 'tool-add_to_cart',
      toolCallId: 'add-ok',
      state: 'output-available',
      input: { menu_item_id: 'margherita', qty: 2, notes: 'extra basil' },
      output: {
        ok: true,
        added: '2 × Margherita',
        price_each: 'RM 22.90',
        action: { type: 'add_to_cart', item: margherita, qty: 2, notes: 'extra basil' },
      },
    },
    {
      type: 'tool-add_to_cart',
      toolCallId: 'add-sold-out',
      state: 'output-available',
      input: { menu_item_id: 'truffle-mushroom', qty: 1 },
      output: { ok: false, reason: 'sold_out', name: 'Truffle Mushroom' },
    },
    {
      type: 'tool-add_to_cart',
      toolCallId: 'add-unfinished',
      state: 'input-available',
      input: { menu_item_id: 'margherita', qty: 1 },
    },
    {
      type: 'tool-add_to_cart',
      toolCallId: 'add-failed',
      state: 'output-error',
      input: { menu_item_id: 'margherita', qty: 1 },
      errorText: 'Invalid input',
    },
    {
      type: 'tool-go_to_checkout',
      toolCallId: 'checkout-1',
      state: 'output-available',
      input: {},
      output: { ok: true, action: { type: 'go_to_checkout' } },
    },
    { type: 'text', text: 'Added! Taking you to checkout.' },
  ],
};

test('only finished, successful add_to_cart and go_to_checkout results become actions', () => {
  assert.deepEqual(chatActions(reply), [
    { toolCallId: 'add-ok', type: 'add_to_cart', item: margherita, qty: 2, notes: 'extra basil' },
    { toolCallId: 'checkout-1', type: 'go_to_checkout' },
  ]);
});

test('a refused checkout (empty cart) does not navigate', () => {
  const refused: ChatMessage = {
    id: 'reply-2',
    role: 'assistant',
    parts: [
      {
        type: 'tool-go_to_checkout',
        toolCallId: 'checkout-2',
        state: 'output-available',
        input: {},
        output: { ok: false, reason: 'empty_cart' },
      },
    ],
  };
  assert.deepEqual(chatActions(refused), []);
});

test('plain text produces no actions', () => {
  assert.deepEqual(chatActions({ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Add 2 margherita' }] }), []);
});
