import { Suspense } from 'react';
import { CategoryNav } from '@/components/menu/category-nav';
import { Menu } from '@/components/menu/menu';
import { MenuSkeleton } from '@/components/menu/menu-skeleton';

// The heading and category links are static, so they are part of the
// prerendered page. Only <Menu> waits for the database.
export default function MenuPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16">
      <section className="py-6">
        <h1 className="text-2xl font-semibold tracking-tight">Our menu</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Halal pizza, pasta and more, made to order for pickup or delivery in Kuala Lumpur.
          Every pizza is a regular 10-inch.
        </p>
      </section>
      <CategoryNav />
      <div className="mt-4">
        <Suspense fallback={<MenuSkeleton />}>
          <Menu />
        </Suspense>
      </div>
    </main>
  );
}
