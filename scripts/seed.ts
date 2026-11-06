import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const MenuItem = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  category: z.enum(['pizza', 'pasta', 'sides', 'drinks', 'desserts']),
  price_cents: z.number().int().positive(),
  spicy_level: z.number().int().min(0).max(3),
  is_halal: z.boolean(),
  allergens: z.array(z.string()),
  tags: z.array(z.string()),
  is_available: z.boolean(),
});

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

async function main() {
  const raw = JSON.parse(readFileSync('data/menu.json', 'utf8'));
  const rows = z.array(MenuItem).parse(raw); // throws with the exact bad field if any row is wrong
  const { error } = await supabase.from('menu_items').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
  console.log(`Seeded ${rows.length} menu items`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});