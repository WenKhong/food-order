# Data notes

Every data issue and decision, and how it was handled.

## Where the data comes from

No company data was supplied. The menu in `data/menu.json` is made up for "US", a halal
pizza restaurant in Kuala Lumpur: 24 items in 5 categories (pizza 9, pasta 4, sides 4,
drinks 4, desserts 3).

It is shaped to exercise the app and the assistant: two sold-out items, spice levels 0–3,
vegetarian tags, cheap items under RM5, and a spread of allergens.

## Decisions

| Topic | Decision | Why |
|---|---|---|
| Money | Integer cents everywhere (`price_cents`, `total_cents`, `unit_price_cents`) | No floating-point rounding errors (`0.1 + 0.2 !== 0.3`) |
| Item id | Readable slug, e.g. `beef-pepperoni` | Stable across re-seeds; easy for the AI tools to pass around |
| Size | Single 10-inch size only | Size variants are out of scope; pizza descriptions say "Regular 10-inch" |
| Sold out | `truffle-mushroom` (seasonal) and `mango-smoothie` | Shows sold-out items as visible but disabled, and tests that the bot won't add them |
| Halal | Every item has `is_halal: true`; Tiramisu is described as alcohol-free | The bot repeats this flag and makes no claims beyond the data |
| Allergens | Simple tags: gluten, dairy, egg, soy, seafood, fish | Not a certified allergen declaration, so the bot suggests asking staff about serious allergies |
| Order prices | `order_items.unit_price_cents` stores the price at the moment of ordering | A later menu price change never rewrites a past order |

## Issues found and how they were handled

1. **Caesar salad allergens were incomplete.** It listed gluten, dairy and egg, but Caesar
   dressing is traditionally made with anchovy. Added `fish`, re-seeded, and
   `scripts/check-db.ts` confirmed the database matches the file again.
2. **The category list changed during setup.** The first schema idea used categories for a
   Malaysian menu. Before any data existed, it was switched to pizza, pasta, sides, drinks
   and desserts, and the change was folded into `supabase/migrations/001_init.sql` instead of
   a separate migration, so replaying 001 on a fresh database gives the current schema.
   Confirmed 2026-11-06 with a query on `pg_constraint`: the live `menu_items` table has
   exactly the three check constraints 001 creates (category, price_cents, spicy_level),
   under the same names, and nothing left over from the old category list.
3. **Leftover examples.** Two SQL comments still named Malaysian dishes. They were replaced;
   the SQL itself is unchanged.

## How the seed works

- `scripts/seed.ts` reads `data/menu.json`, validates every row with zod, then upserts by `id`.
- **All-or-nothing:** one invalid row stops the seed before anything is written. It's our
  own file, so a typo should fail loudly instead of silently dropping an item.
- **Safe to run twice:** an upsert updates rows that already exist.
- **Never deletes:** to retire an item, set `is_available: false`, because past orders
  reference items by id.
- `scripts/check-db.ts` (read-only) compares every seeded column with the file in both
  directions, and confirms the server key can reach `orders`, `order_items` and `place_order`.

Last verified 2026-11-06: 24 rows, sold out = truffle-mushroom and mango-smoothie, zero
drift, `orders` and `order_items` reachable (empty), `place_order` exposed to the server key.

## Database access

- The migration grants table access only to `service_role`, and RLS is on with no policies,
  so the public (anon) key can't read or write anything, even if someone found it.
- The app reaches the database only from server code, with the secret key.
- The Data API schema also lists a function called `rls_auto_enable`. It is not part of our
  migrations: Supabase created it for the project setting that turns RLS on automatically
  for new tables.
