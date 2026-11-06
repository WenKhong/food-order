import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CheckoutDetails, OrderLine, PhoneMY, PlaceOrderRequest } from './order';

const pickup = { customer_name: 'Wen', phone: '012-345 6789', fulfilment: 'pickup' };
const line = { menu_item_id: 'margherita', qty: 2 };

test('phone: accepts common Malaysian mobile formats and stores one format', () => {
  assert.equal(PhoneMY.parse('012-345 6789'), '+60123456789');
  assert.equal(PhoneMY.parse('+60 11-2345 6789'), '+601123456789');
  assert.equal(PhoneMY.parse('60123456789'), '+60123456789');
  assert.equal(PhoneMY.parse('+60 012 345 6789'), '+60123456789');
  assert.equal(PhoneMY.parse('(012) 3456789'), '+60123456789');
});

test('phone: rejects landlines, short numbers, other countries and junk', () => {
  for (const bad of ['03-1234 5678', '012-345', '+65 9123 4567', 'not a number', '']) {
    assert.equal(PhoneMY.safeParse(bad).success, false, `should reject "${bad}"`);
  }
});

test('order line: quantity must be a whole number from 1 to 20', () => {
  assert.equal(OrderLine.safeParse({ ...line, qty: 0 }).success, false);
  assert.equal(OrderLine.safeParse({ ...line, qty: 21 }).success, false);
  assert.equal(OrderLine.safeParse({ ...line, qty: 1.5 }).success, false);
  assert.equal(OrderLine.safeParse({ ...line, qty: 20 }).success, true);
});

test('order line: item id must look like a menu slug', () => {
  assert.equal(OrderLine.safeParse({ ...line, menu_item_id: 'Margherita' }).success, false);
  assert.equal(OrderLine.safeParse({ ...line, menu_item_id: 'margherita pizza' }).success, false);
});

test('order line: a price sent by the client is dropped', () => {
  const parsed = OrderLine.parse({ ...line, price_cents: 1 });
  assert.equal('price_cents' in parsed, false);
});

test('checkout: pickup needs no address', () => {
  assert.equal(CheckoutDetails.safeParse(pickup).success, true);
});

test('checkout: delivery needs an address, reported on the address field', () => {
  const missing = CheckoutDetails.safeParse({ ...pickup, fulfilment: 'delivery' });
  assert.equal(missing.success, false);
  assert.deepEqual(missing.error?.issues[0]?.path, ['address']);

  const withAddress = { ...pickup, fulfilment: 'delivery', address: '12 Jalan Bukit Bintang, KL' };
  assert.equal(CheckoutDetails.safeParse(withAddress).success, true);
});

test('place order: needs at least one item', () => {
  assert.equal(PlaceOrderRequest.safeParse({ ...pickup, items: [] }).success, false);
  assert.equal(PlaceOrderRequest.safeParse({ ...pickup, items: [line] }).success, true);
});

test('place order: a total sent by the client is dropped', () => {
  const parsed = PlaceOrderRequest.parse({ ...pickup, items: [line], total_cents: 1 });
  assert.equal('total_cents' in parsed, false);
});
