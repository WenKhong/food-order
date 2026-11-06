import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { MenuItem } from './menu';

const menu = JSON.parse(readFileSync('data/menu.json', 'utf8'));

test('every item in data/menu.json matches the MenuItem schema', () => {
  assert.doesNotThrow(() => z.array(MenuItem).parse(menu));
});

test('menu item ids are unique (a duplicate would overwrite another item on upsert)', () => {
  const ids = menu.map((item: { id: string }) => item.id);
  assert.equal(new Set(ids).size, ids.length);
});
