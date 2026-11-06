import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { MenuItem } from '../lib/schemas/menu'; // same schema the app uses

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