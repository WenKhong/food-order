import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ORDER_STATUSES } from '@/lib/schemas/order';
import { canMoveTo, isFinished, nextStatuses } from './status';

test('the normal path moves one step forward at a time', () => {
  assert.equal(canMoveTo('pending', 'preparing'), true);
  assert.equal(canMoveTo('preparing', 'ready'), true);
  assert.equal(canMoveTo('ready', 'completed'), true);
});

test('an order can be cancelled until it is completed', () => {
  for (const from of ['pending', 'preparing', 'ready'] as const) {
    assert.equal(canMoveTo(from, 'cancelled'), true, from);
  }
});

test('skipping steps or going backwards is not allowed', () => {
  assert.equal(canMoveTo('pending', 'ready'), false);
  assert.equal(canMoveTo('pending', 'completed'), false);
  assert.equal(canMoveTo('ready', 'preparing'), false);
  assert.equal(canMoveTo('preparing', 'pending'), false);
  assert.equal(canMoveTo('pending', 'pending'), false);
});

test('finished orders never change', () => {
  for (const to of ORDER_STATUSES) {
    assert.equal(canMoveTo('completed', to), false, `completed -> ${to}`);
    assert.equal(canMoveTo('cancelled', to), false, `cancelled -> ${to}`);
  }
});

test('an order is "finished" exactly when it has no next status', () => {
  for (const status of ORDER_STATUSES) {
    assert.equal(isFinished(status), nextStatuses(status).length === 0, status);
  }
});
