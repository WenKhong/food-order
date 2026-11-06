import { z } from 'zod';

// The order categories appear on the menu page. The database only accepts these five.
export const CATEGORIES = ['pizza', 'pasta', 'sides', 'drinks', 'desserts'] as const;
export const Category = z.enum(CATEGORIES);
export type Category = z.infer<typeof Category>;

// Item ids are readable slugs, e.g. "beef-pepperoni".
export const ItemId = z.string().regex(/^[a-z0-9-]+$/, 'Not a menu item id').max(64);

// One menu item, as stored in menu_items and in data/menu.json.
export const MenuItem = z.object({
  id: ItemId,
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  category: Category,
  price_cents: z.number().int().positive(),
  spicy_level: z.number().int().min(0).max(3),
  is_halal: z.boolean(),
  allergens: z.array(z.string()),
  tags: z.array(z.string()),
  is_available: z.boolean(),
});
export type MenuItem = z.infer<typeof MenuItem>;
