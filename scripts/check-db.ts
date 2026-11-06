// Read-only health check. It never writes anything. It answers two questions:
//   1. Does the live menu_items table match data/menu.json exactly?
//   2. Can the server key reach everything the app needs (tables + place_order)?
// Run: npx tsx --env-file=.env.local scripts/check-db.ts
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// Scripts create their own client because lib/supabase/server.ts is marked
// "server-only", and that marker only loads inside Next.js.
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (run with --env-file=.env.local).');
  process.exit(1);
}
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Every column the seed writes, compared field by field.
const FIELDS = [
  'name',
  'description',
  'category',
  'price_cents',
  'spicy_level',
  'is_halal',
  'allergens',
  'tags',
  'is_available',
] as const;

type MenuRow = { id: string } & Record<(typeof FIELDS)[number], unknown>;

const problems: string[] = [];

// JSON.stringify gives a simple deep comparison for strings, numbers and arrays.
function same(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

async function checkMenu() {
  const expected: MenuRow[] = JSON.parse(readFileSync('data/menu.json', 'utf8'));
  const { data, error } = await supabase.from('menu_items').select('*');
  if (error) {
    problems.push(`menu_items: ${error.message}`);
    return;
  }
  const rows: MenuRow[] = data;
  const rowsById = new Map(rows.map((row) => [row.id, row]));

  for (const item of expected) {
    const row = rowsById.get(item.id);
    if (!row) {
      problems.push(`menu_items: "${item.id}" is in menu.json but not in the DB`);
      continue;
    }
    for (const field of FIELDS) {
      if (!same(row[field], item[field])) {
        problems.push(
          `menu_items: ${item.id}.${field} is ${JSON.stringify(row[field])} in the DB, ` +
            `${JSON.stringify(item[field])} in menu.json`,
        );
      }
    }
  }

  const expectedIds = new Set(expected.map((item) => item.id));
  for (const row of rows) {
    if (!expectedIds.has(row.id)) {
      problems.push(`menu_items: "${row.id}" is in the DB but not in menu.json`);
    }
  }

  const perCategory = new Map<string, number>();
  for (const row of rows) {
    const category = String(row.category);
    perCategory.set(category, (perCategory.get(category) ?? 0) + 1);
  }
  const categories = [...perCategory].map(([name, count]) => `${name} ${count}`).join(', ');
  const soldOut = rows.filter((row) => row.is_available === false).map((row) => row.id);

  console.log(`menu_items: ${rows.length} rows (${categories})`);
  console.log(`sold out: ${soldOut.join(', ') || 'none'}`);
}

// A head-only count proves the server key has been granted access to the table.
async function checkTable(table: 'orders' | 'order_items') {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) {
    problems.push(`${table}: ${error.message}`);
    return;
  }
  console.log(`${table}: reachable (${count} rows)`);
}

// The Data API publishes an OpenAPI description of what it exposes.
// If place_order is missing there, the API's schema cache is stale.
async function checkPlaceOrder() {
  const response = await fetch(`${url}/rest/v1/`, { headers: { apikey: key! } });
  if (!response.ok) {
    problems.push(`API schema: HTTP ${response.status}`);
    return;
  }
  const spec: { paths?: Record<string, unknown> } = await response.json();
  if (!spec.paths?.['/rpc/place_order']) {
    problems.push('place_order: not in the API schema (try: notify pgrst, \'reload schema\';)');
    return;
  }
  console.log('place_order: exposed to the server key');
}

async function main() {
  await checkMenu();
  await checkTable('orders');
  await checkTable('order_items');
  await checkPlaceOrder();

  if (problems.length > 0) {
    console.error(`\n${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log('\nAll checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
