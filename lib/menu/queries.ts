import 'server-only';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase/server';
import { CATEGORIES, MenuItem } from '@/lib/schemas/menu';

const MenuItems = z.array(MenuItem);

// The whole menu (24 rows), in the order the menu page shows it.
// Rows are checked with the same schema the seed uses, so the app never works
// with a row in a shape it doesn't expect.
export async function getMenu(): Promise<MenuItem[]> {
  const { data, error } = await getSupabase().from('menu_items').select('*');
  if (error) {
    throw new Error(`Could not load the menu: ${error.message}`);
  }
  return MenuItems.parse(data).sort(byCategoryThenName);
}

function byCategoryThenName(a: MenuItem, b: MenuItem) {
  const byCategory = CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category);
  return byCategory !== 0 ? byCategory : a.name.localeCompare(b.name);
}
