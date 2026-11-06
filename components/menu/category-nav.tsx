import { cn } from 'cn';
import { buttonVariants } from '@/components/ui/button';
import { CATEGORY_INFO } from '@/lib/menu/categories';
import { CATEGORIES } from '@/lib/schemas/menu';

// Jump links to each menu section. Plain anchors, so no JavaScript is needed.
// It sticks under the header (h-14) while the menu scrolls.
export function CategoryNav() {
  return (
    <nav
      aria-label="Menu categories"
      className="sticky top-14 z-10 -mx-4 bg-background/95 px-4 py-2 backdrop-blur"
    >
      <ul className="flex gap-2 overflow-x-auto">
        {CATEGORIES.map((category) => (
          <li key={category} className="shrink-0">
            {/* cn() resolves the base `border-transparent` vs the outline border, as <Button> does */}
            <a href={`#${category}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              <span aria-hidden="true">{CATEGORY_INFO[category].emoji}</span>
              {CATEGORY_INFO[category].label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
