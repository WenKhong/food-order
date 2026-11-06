import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatRM } from './money';

test('formats cents as ringgit with two decimals', () => {
  assert.equal(formatRM(2890), 'RM 28.90');
  assert.equal(formatRM(300), 'RM 3.00');
  assert.equal(formatRM(5), 'RM 0.05');
  assert.equal(formatRM(0), 'RM 0.00');
});

test('groups thousands with commas', () => {
  assert.equal(formatRM(123456), 'RM 1,234.56');
});

test('rejects anything that is not whole, non-negative cents', () => {
  assert.throws(() => formatRM(-100), RangeError);
  assert.throws(() => formatRM(28.9), RangeError);
  assert.throws(() => formatRM(Number.NaN), RangeError);
});
