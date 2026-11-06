'use client'; // error boundaries must be Client Components

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

// Shown in place of the page when something fails on the server, e.g. the
// database can't be reached. In production Next.js hides the error's details
// from the browser (only a digest that matches the server log is sent), so
// nothing internal can leak here.
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <h1 className="text-lg font-semibold">Sorry, something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        We couldn&apos;t load this page. This is usually temporary.
      </p>
      {/* retry() re-fetches the data and re-renders, unlike reset() */}
      <Button onClick={() => retry()}>Try again</Button>
    </main>
  );
}
