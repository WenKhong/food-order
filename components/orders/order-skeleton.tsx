import { Skeleton } from '@/components/ui/skeleton';

export function OrderSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">Loading your order…</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-14" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}
