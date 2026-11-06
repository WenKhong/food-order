import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderRejection } from './errors';

test('a sold-out item becomes a sold_out rejection with the item id', () => {
  assert.deepEqual(orderRejection({ code: 'P0001', message: 'Item unavailable: truffle-mushroom' }), {
    reason: 'sold_out',
    itemId: 'truffle-mushroom',
  });
});

test('an item that is not on the menu becomes an unknown_item rejection', () => {
  assert.deepEqual(orderRejection({ code: 'P0001', message: 'Unknown item: sushi' }), {
    reason: 'unknown_item',
    itemId: 'sushi',
  });
});

test('database check violations become an invalid rejection', () => {
  assert.deepEqual(orderRejection({ code: '23514', message: 'violates check constraint' }), { reason: 'invalid' });
  assert.deepEqual(orderRejection({ code: '23502', message: 'null value in column' }), { reason: 'invalid' });
});

test('anything else is not a rejection, so it surfaces as a server error', () => {
  assert.equal(orderRejection({ code: '08006', message: 'connection failure' }), null);
  assert.equal(orderRejection({ code: 'P0001', message: 'Order has no items' }), null);
  assert.equal(orderRejection({ message: 'Item unavailable: x' }), null); // wrong code, not trusted
});
