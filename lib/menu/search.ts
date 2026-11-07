import type { Category, MenuItem } from '@/lib/schemas/menu';

// What the assistant can ask of the menu. Every field is optional, and every
// given filter must match. Sold-out items are still returned (marked as such),
// so the assistant can say "that's sold out" rather than "we don't have it".
export type MenuSearch = {
  query?: string; // English keywords, matched against name, description, category and tags
  category?: Category;
  max_price_cents?: number;
  max_spice_level?: number; // 0 = not spicy at all
  vegetarian_only?: boolean;
  exclude_allergens?: string[]; // e.g. ["seafood", "fish"]
};

export function searchMenu(items: MenuItem[], search: MenuSearch): MenuItem[] {
  const words = (search.query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  const excluded = new Set((search.exclude_allergens ?? []).map((allergen) => allergen.toLowerCase()));

  return items.filter((item) => {
    if (search.category && item.category !== search.category) return false;
    if (search.max_price_cents !== undefined && item.price_cents > search.max_price_cents) return false;
    if (search.max_spice_level !== undefined && item.spicy_level > search.max_spice_level) return false;
    if (search.vegetarian_only && !item.tags.includes('vegetarian')) return false;
    if (item.allergens.some((allergen) => excluded.has(allergen))) return false;

    if (words.length > 0) {
      const text = [item.name, item.description ?? '', item.category, ...item.tags].join(' ').toLowerCase();
      // Every word must appear somewhere; a trailing "s" is optional ("pizzas" finds "pizza").
      const found = (word: string) => text.includes(word) || (word.endsWith('s') && text.includes(word.slice(0, -1)));
      if (!words.every(found)) return false;
    }
    return true;
  });
}
