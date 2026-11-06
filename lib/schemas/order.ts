import { z } from 'zod';
import { ItemId } from './menu';

// Malaysian mobile numbers are 01X-XXX XXXX (011 numbers have one extra digit).
// Group 1 captures the number without its leading 0, e.g. "123456789".
const MY_MOBILE = /^(?:\+?600?|0)(1[0-46-9]\d{7,8})$/;

// Accepts what people actually type ("012-345 6789", "+60 12-345 6789",
// "(012) 3456789") and stores one format: "+60123456789".
export const PhoneMY = z
  .string()
  .transform((raw) => raw.replace(/[\s()-]/g, ''))
  .refine((digits) => MY_MOBILE.test(digits), 'Enter a Malaysian mobile number, e.g. 012-345 6789')
  .transform((digits) => digits.replace(MY_MOBILE, '+60$1'));

// One cart line as the browser sends it. There is deliberately no price field:
// zod drops unknown keys, so a price from the client never reaches the database,
// and place_order() looks up every price itself.
export const OrderLine = z.object({
  menu_item_id: ItemId,
  qty: z.number().int().min(1).max(20),
  notes: z.string().trim().max(200).optional(),
});
export type OrderLine = z.infer<typeof OrderLine>;

export const Fulfilment = z.enum(['pickup', 'delivery']);

const checkoutFields = {
  customer_name: z.string().trim().min(2, 'Please enter your name').max(80, 'Name is too long'),
  phone: PhoneMY,
  fulfilment: Fulfilment,
  address: z.string().trim().max(300, 'Address is too long').optional(),
};

// Delivery needs an address. The database enforces the same rule.
function hasAddressIfDelivery(form: { fulfilment: string; address?: string }) {
  return form.fulfilment === 'pickup' || (form.address ?? '').length >= 10;
}
const addressMissing = { message: 'Please enter your delivery address', path: ['address'] };

// The checkout form on its own: the browser uses it for instant feedback.
export const CheckoutDetails = z.object(checkoutFields).refine(hasAddressIfDelivery, addressMissing);
export type CheckoutDetails = z.infer<typeof CheckoutDetails>;

// The whole POST /api/orders body: the checkout form plus the cart lines.
export const PlaceOrderRequest = z
  .object({
    ...checkoutFields,
    items: z.array(OrderLine).min(1, 'Your cart is empty').max(30, 'Too many different items'),
  })
  .refine(hasAddressIfDelivery, addressMissing);
export type PlaceOrderRequest = z.infer<typeof PlaceOrderRequest>;
