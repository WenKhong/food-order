import type { Metadata } from 'next';
import { CheckoutForm } from '@/components/checkout/checkout-form';

export const metadata: Metadata = { title: 'Checkout' };

export default function CheckoutPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Checkout</h1>
      <CheckoutForm />
    </main>
  );
}
