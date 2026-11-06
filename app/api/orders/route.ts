import { z } from 'zod';
import { placeOrder } from '@/lib/orders/queries';
import { PlaceOrderRequest } from '@/lib/schemas/order';

// POST /api/orders. The browser sends contact details plus item ids, quantities
// and notes. Prices and the total are always worked out by the database.
//   201 { id }                         order placed
//   400 { error: 'bad_json' }          body isn't JSON
//   422 { error: 'validation', fields } failed the shared zod schema
//   409 { error: 'sold_out', itemId }  an item sold out since it was added
//   422 { error: 'unknown_item' | 'invalid' }
//   500 { error: 'server' }            anything unexpected (details only in the server log)
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'bad_json', message: 'Request body must be JSON.' }, { status: 400 });
  }

  const parsed = PlaceOrderRequest.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: 'validation',
        message: 'Please check your details.',
        fields: z.flattenError(parsed.error).fieldErrors,
      },
      { status: 422 },
    );
  }

  try {
    const result = await placeOrder(parsed.data);
    if (result.ok) {
      return Response.json({ id: result.id }, { status: 201 });
    }
    if (result.reason === 'sold_out') {
      return Response.json(
        { error: 'sold_out', itemId: result.itemId, message: 'An item in your cart has just sold out.' },
        { status: 409 },
      );
    }
    if (result.reason === 'unknown_item') {
      return Response.json(
        { error: 'unknown_item', itemId: result.itemId, message: 'An item in your cart is no longer on the menu.' },
        { status: 422 },
      );
    }
    return Response.json({ error: 'invalid', message: 'Please check your order.' }, { status: 422 });
  } catch (error) {
    // Log the error only, not the request body: it contains a phone number.
    console.error('POST /api/orders failed:', error);
    return Response.json(
      { error: 'server', message: 'We could not place your order. Please try again.' },
      { status: 500 },
    );
  }
}
