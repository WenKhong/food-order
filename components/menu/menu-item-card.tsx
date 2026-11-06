import { cn } from 'cn';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import { badgeVariants } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatRM } from '@/lib/money';
import type { MenuItem } from '@/lib/schemas/menu';

// Tags worth a badge on the card. Others (e.g. "budget") only help search.
const TAG_BADGES = new Map([
  ['vegetarian', 'Vegetarian'],
  ['bestseller', 'Bestseller'],
  ['signature', 'Signature'],
  ['local-twist', 'Local twist'],
  ['seasonal', 'Seasonal'],
]);

// A Server Component: it renders to HTML, and only the Add button inside it
// ships JavaScript. Badges use badgeVariants on a plain <span> because shadcn's
// <Badge> calls a Base UI hook that needs useRef, which doesn't exist in
// Server Components.
export function MenuItemCard({ item }: { item: MenuItem }) {
  const soldOut = !item.is_available;
  const tagLabels = item.tags.flatMap((tag) => TAG_BADGES.get(tag) ?? []);
  const hasBadges = soldOut || tagLabels.length > 0 || !item.is_halal || item.spicy_level > 0;

  return (
    <Card className={cn('h-full', soldOut && 'opacity-60')}>
      <CardHeader>
        <CardTitle>{item.name}</CardTitle>
        <CardAction className="font-medium tabular-nums">{formatRM(item.price_cents)}</CardAction>
        {item.description && <CardDescription>{item.description}</CardDescription>}
      </CardHeader>
      <CardContent className="mt-auto flex flex-col gap-2">
        {hasBadges && (
          <div className="flex flex-wrap items-center gap-1.5">
            {soldOut && <span className={badge('destructive')}>Sold out</span>}
            {tagLabels.map((label) => (
              <span key={label} className={badge('secondary')}>
                {label}
              </span>
            ))}
            {!item.is_halal && <span className={badge('outline')}>Not halal</span>}
            {item.spicy_level > 0 && <SpiceLevel level={item.spicy_level} />}
          </div>
        )}
        {item.allergens.length > 0 && (
          <p className="text-xs text-muted-foreground">Contains: {item.allergens.join(', ')}</p>
        )}
      </CardContent>
      <CardFooter>
        <AddToCartButton
          item={{ id: item.id, name: item.name, price_cents: item.price_cents }}
          available={item.is_available}
        />
      </CardFooter>
    </Card>
  );
}

// cn() resolves conflicting classes (e.g. the outline border), as <Badge> itself does.
function badge(variant: 'destructive' | 'secondary' | 'outline') {
  return cn(badgeVariants({ variant }));
}

function SpiceLevel({ level }: { level: number }) {
  const label = `Spice level ${level} of 3`;
  return (
    <span role="img" aria-label={label} title={label} className="text-xs">
      {'🌶️'.repeat(level)}
    </span>
  );
}
