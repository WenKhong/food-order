'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Asks the server for a fresh copy of this page every few seconds, so a status
// change made in /admin shows up without the customer reloading. Only the
// server-rendered data is re-fetched; nothing on the page is reset.
export function AutoRefresh({ everyMs }: { everyMs: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), everyMs);
    return () => clearInterval(timer);
  }, [router, everyMs]);

  return null;
}
