import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-lg font-bold tracking-tight">
            <span aria-hidden="true">🍕 </span>US
          </span>
          <span className="text-xs text-muted-foreground">Halal pizza · Kuala Lumpur</span>
        </Link>
      </div>
    </header>
  );
}
