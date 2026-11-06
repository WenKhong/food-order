// place_order() raises an exception when it can't accept an order. The whole call
// runs in one transaction, so nothing is saved when that happens. This turns the
// database error into a reason we can explain to the customer.
export type OrderRejection =
  | { reason: 'sold_out'; itemId: string }
  | { reason: 'unknown_item'; itemId: string }
  | { reason: 'invalid' };

// Postgres error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
const RAISE_EXCEPTION = 'P0001'; // `raise exception` inside place_order()
const CHECK_VIOLATION = '23514'; // e.g. qty outside 1-20
const NOT_NULL_VIOLATION = '23502';

export function orderRejection(error: { code?: string; message?: string }): OrderRejection | null {
  const message = error.message ?? '';

  if (error.code === RAISE_EXCEPTION) {
    const soldOut = /^Item unavailable: (.+)$/.exec(message);
    if (soldOut) return { reason: 'sold_out', itemId: soldOut[1] };

    const unknown = /^Unknown item: (.+)$/.exec(message);
    if (unknown) return { reason: 'unknown_item', itemId: unknown[1] };
  }

  if (error.code === CHECK_VIOLATION || error.code === NOT_NULL_VIOLATION) {
    return { reason: 'invalid' };
  }

  return null; // unexpected: the caller treats it as a server error
}
