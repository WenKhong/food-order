import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrderDetails } from '@/components/orders/order-details';
import { OrderSkeleton } from '@/components/orders/order-skeleton';

export const metadata: Metadata = {
  title: 'Your order',
  robots: { index: false }, // order links are private, keep them out of search engines
};

// The id in the URL is only known per request, so the details render inside
// <Suspense>; the page around them is prerendered.
export default function OrderPage({ params }: PageProps<'/orders/[id]'>) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Suspense fallback={<OrderSkeleton />}>
        <OrderDetails params={params} />
      </Suspense>
    </main>
  );
}
