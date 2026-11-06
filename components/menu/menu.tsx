import { connection } from 'next/server';
import { CATEGORY_INFO } from '@/lib/menu/categories';
import { getMenu } from '@/lib/menu/queries';
import { CATEGORIES } from '@/lib/schemas/menu';
import { MenuItemCard } from './menu-item-card';

// Reads the menu when a request comes in, not at build time, so a sold-out
// change shows up straight away. It's rendered inside <Suspense>, so the rest
// of the page appears first while this part streams in.
export async function Menu() {
  await connection();
  const items = await getMenu();

  return (
    <div className="flex flex-col gap-10">
      {CATEGORIES.map((category) => {
        const inCategory = items.filter((item) => item.category === category);
        if (inCategory.length === 0) return null;

        const { label, emoji } = CATEGORY_INFO[category];
        return (
          // scroll-mt keeps the heading visible below the sticky header and nav
          <section key={category} id={category} aria-labelledby={`${category}-heading`} className="scroll-mt-28">
            <h2 id={`${category}-heading`} className="mb-3 text-lg font-semibold">
              <span aria-hidden="true">{emoji} </span>
              {label}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {inCategory.map((item) => (
                <li key={item.id}>
                  <MenuItemCard item={item} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
