import Link from 'next/link';
import { cn } from 'cn';
import { buttonVariants } from '@/components/ui/button';

// Shown for unknown URLs, and wherever notFound() is called (e.g. a bad order link).
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <h1 className="text-lg font-semibold">We couldn&apos;t find that page</h1>
      <p className="text-sm text-muted-foreground">
        If you followed an order link, check that it was copied in full.
      </p>
      <Link href="/" className={cn(buttonVariants())}>
        Back to the menu
      </Link>
    </main>
  );
}
