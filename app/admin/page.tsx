import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminGate } from '@/components/admin/admin-gate';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

// The session cookie is only known per request, so the gate renders inside
// <Suspense> (required with Cache Components); the page around it is static.
export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <Suspense fallback={<Skeleton className="mx-auto h-56 w-full max-w-sm rounded-xl" />}>
        <AdminGate />
      </Suspense>
    </main>
  );
}
