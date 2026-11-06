import { Skeleton } from '@/components/ui/skeleton';

// Shown while the menu loads. It mirrors the real layout so nothing jumps
// when the menu arrives.
export function MenuSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-10">
      <span className="sr-only">Loading the menu…</span>
      {[0, 1].map((section) => (
        <div key={section}>
          <Skeleton className="mb-3 h-6 w-28" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((card) => (
              <Skeleton key={card} className="h-36 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
