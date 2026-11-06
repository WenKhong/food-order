# Plan: "US" — online pizza ordering with an AI assistant

## Context
24-hour internship take-home: a mini web app for online food ordering with an AI chatbot.
Part A (scaffold, Supabase, Gemini key, GitHub, Vercel) and the pizza menu data are done.
This plan checks that starting state against the repo and the live DB, fixes what's missing, and
lays out the rest of the build as small commits that are easy to defend in the interview.
This file lives at `docs/PLAN.md`; boxes are ticked as work lands, so any session can resume from here.
If more of the brief is pasted later, this plan gets updated.

## Step 0: verified starting state (2026-11-06)

| Item | Expected | Actual | OK? |
|---|---|---|---|
| Scaffold | Next App Router + TS + Tailwind + shadcn (Base UI, Nova) | Next 16.4.5, React 19.3, TS 5.9 `strict`, Tailwind 4.3.4 (via `@tailwindcss/turbopack` loader), shadcn 4.23 `style: base-nova`, `@base-ui/react` 1.9. UI so far: badge, button, card, input, sheet. `cacheComponents` + `partialPrefetching` on (create-next-app defaults in 16.4) | ✅ |
| Packages | ai, @ai-sdk/google, zod, supabase-js | ai 7.0.163, @ai-sdk/google 4.0.112, zod 4.6.7, @supabase/supabase-js 2.119.0. Also `cn` 0.5.2 = shadcn's own clsx + tailwind-merge replacement (repo `shadcn-ui/cn`), legit | ✅ |
| `.env.local` names | 4 keys | GOOGLE_GENERATIVE_AI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (holds a `sb_secret_` key), ADMIN_PASSWORD. All set, none NEXT_PUBLIC_ | ✅ |
| `.env.example` | same names, empty, tracked | Names right and empty, **but matched by `.env*` (.gitignore:34), so it was never committed** | ❌ |
| `.env.local` ignored | yes | yes (.gitignore:35) | ✅ |
| Secrets in git history | none | 0 hits in all commits for `sb_secret_…`, `AIza…`, `ADMIN_PASSWORD=<value>`, legacy `eyJ…` JWTs, the project URL. Working tree clean too | ✅ |
| `scripts/test-ai.ts` | fallback list, 3.8 first | **One hardcoded model, no fallback list, no error handling.** `lib/ai/models.ts` (named in CLAUDE.md) doesn't exist | ❌ |
| CLAUDE.md | matches reality | **Uncommitted edit** (env name changed to SERVICE_ROLE_KEY). Line 24 still says SUPABASE_SECRET_KEY. Data + DB sections still describe "company dummy data" and skip-bad-rows rules that don't apply | ❌ |
| `001_init.sql` | 3 tables, place_order(), RLS, grants | All present and correct. Category check **already** pizza/pasta/sides/drinks/desserts. 2 leftover comments (`nasi-lemak-ayam`, `teh-tarik`) | ✅ (cosmetic) |
| `002_pizza_categories.sql` | exists | **Does not exist** (not on disk, not in git). Decision: keep 001 only, document it | ❌ → documented |
| `data/menu.json` | 24 items, 2 unavailable | 24. Unavailable: truffle-mushroom, mango-smoothie. pizza 9 / pasta 4 / sides 4 / drinks 4 / desserts 3 | ✅ |
| `scripts/seed.ts` | 5 pizza categories | Enum matches. Validates the whole file at once (any bad row aborts) | ✅ |
| Live DB (server client + secret key) | 24 rows, 2 unavailable | 24 rows, same 2 unavailable, same counts, **zero drift** vs menu.json. `orders`/`order_items` reachable (0 rows). `/rpc/place_order` is in the API schema cache | ✅ |
| Gemini key | works | 200 from the models API. `gemini-3.8-flash`, `3.7-flash` and `3.5-flash` all available | ✅ |
| Git remote | GitHub | origin → github.com/WenKhong/food-order, branch `main` | ✅ |
| Vercel | connected | Can't check from here (no CLI, no `.vercel/`). **Wen confirms**, including env var names | ❓ |
| Extras | — | `.Rhistory` (empty R file) is tracked. README, `app/page.tsx` and layout metadata are still create-next-app boilerplate | ⚠️ |

### Broken or missing, and the fix
- `.env.example` ignored → **0a**
- `.Rhistory` tracked → **0a**
- CLAUDE.md inconsistent → **0b**
- Stale SQL comments → **0d**
- No fallback list / no `lib/ai/models.ts` → **0e**
- 002 missing → **1c** (documented) + Wen's one-line check
- Caesar salad allergen gap (anchovy) → **1b**
- Missing deps (`tsx`, `@ai-sdk/react`) → **2a**, **8** (approved)
- Boilerplate UI and README → steps **3** and **12**

## Decisions (confirmed with Wen)
- **Deps:** `tsx` as a pinned devDependency (step 2). `@ai-sdk/react@4.0.167` (step 8; it pins ai@7.0.163 exactly). Tests use Node's built-in `node:test`, with no test framework. `server-only` needs no install (Next handles that import internally).
- **Brand: "US"** (halal pizza, KL). The system prompt is used exactly as given except the name: `You are the ordering assistant for "US", a halal pizza restaurant in Kuala Lumpur.` The quotes stop the model reading it as the country.
- **Migrations:** keep `001_init.sql` only and record the category switch in DATA_NOTES.md.
- **Data:** add `"fish"` to caesar-salad allergens (anchovy in Caesar dressing), then re-seed.
- **Env name:** `SUPABASE_SERVICE_ROLE_KEY` everywhere (Wen's rename).
- **Seed stays all-or-nothing.** It's our own file, so fail loudly instead of uploading a partial menu. CLAUDE.md is updated to say so.
- **Test runner moves to step 2** (from 11) so every feature ships with its tests. Step 11 fills the gaps.
- **Page features also run `npm run build`.** Cache Components errors (DB reads outside Suspense) only show up at build time.

---

## NEXT: Phase 0 (fixes) → Step 1 → Step 2
After every commit: `npm run lint && npx tsc --noEmit` (+ `npm test` once it exists), then a plain-English explanation.

### Phase 0: fix the starting state
- [x] **0a** `chore: track .env.example and remove stray .Rhistory`. `.gitignore`: add `!.env.example` after `.env*`, add `.Rhistory`. `git add .env.example`, `git rm .Rhistory`. Check: `git check-ignore .env.example` prints nothing.
- [x] **0b** `docs: align CLAUDE.md with the real setup`. Keeps Wen's pending rename. Line 24 → SUPABASE_SERVICE_ROLE_KEY. "Schema follows company dummy data" → "schema designed for our own menu". Data section → own menu, all-or-nothing zod validation, DATA_NOTES.md. Brand "US".
- [x] **0c** `docs: add build plan`. Adds `docs/PLAN.md` (this file).
- [ ] **0d** `chore: replace leftover Malaysian-menu examples in 001 comments`. Comments only; the SQL statements are unchanged, so nothing needs re-running.
- [ ] **0e** `feat: add model fallback list and per-model smoke test`. `lib/ai/models.ts` exports `MODEL_IDS = ['gemini-3.8-flash', 'gemini-3.5-flash']`. `scripts/test-ai.ts` tries each model, prints OK/FAIL + latency, and exits 1 if none answer. Why 3.5-flash as backup: a different model has its own rate-limit quota and capacity, and the non-lite version keeps tool-calling quality.
- [ ] **Wen:** run this in the Supabase SQL Editor and paste the result. Expect exactly the price, spicy_level and category checks from 001:
  `select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.menu_items'::regclass and contype = 'c';`
- [ ] **Wen:** confirm Vercel is connected and its env vars use the same 4 names. Especially `SUPABASE_SERVICE_ROLE_KEY`, not the old `SUPABASE_SECRET_KEY`.

### Step 1: verify the data layer
- [ ] **1a** `chore: add read-only database check script`. `scripts/check-db.ts` checks:
  - row count, unavailable ids, category counts
  - drift vs `data/menu.json`
  - `orders`/`order_items` reachable
  - `place_order` present in the API schema

  It exits 1 on any mismatch. It makes its own client because `server-only` modules refuse to load outside Next. Run: `npx tsx --env-file=.env.local scripts/check-db.ts`.
- [ ] **1b** `fix: list fish allergen for Chicken Caesar Salad`. Edits `data/menu.json`, then re-run `scripts/seed.ts` (upsert, safe to run twice) and `check-db.ts` → zero drift.
- [ ] **1c** `docs: add DATA_NOTES.md`. Covers:
  - provenance: made-up menu, no company data
  - money in integer cents
  - single 10-inch size
  - the 2 sold-out items and why
  - `is_halal` is a data claim only
  - allergen tags aren't certified (+ the Caesar fix)
  - seed behaviour: all-or-nothing upsert; rows removed from the JSON aren't deleted (mark them unavailable instead, since `order_items` reference them)
  - category switch folded into 001
  - the Supabase-managed `rls_auto_enable` function visible in the API schema (from the auto-RLS setting)

### Step 2: `lib/` foundations
- [ ] **2a** `chore: add tsx and npm test script`. `tsx` devDependency (pinned). Scripts: `"test": "tsx --test 'lib/**/*.test.ts'"` and `"check": "npm run lint && tsc --noEmit && npm test"`. CLAUDE.md Commands updated.
- [ ] **2b** `feat: add RM money formatter`. `lib/money.ts`: `formatRM(cents)` → `"RM 28.90"`, integer math only (`Math.floor(c / 100)`, `c % 100`, en-MY grouping), so no floats even for display. `lib/money.test.ts`: 2890, 300, 5, 0, 123456 → `RM 1,234.56`; rejects negative and non-integer input.
- [ ] **2c** `feat: add shared zod schemas for menu and orders`.
  - `lib/schemas/menu.ts`: `Category`, `CATEGORIES` (display order), `MenuItem`.
  - `lib/schemas/order.ts`:
    - `phoneMY`: strips spaces/dashes, matches `^(\+?60|0)1[0-46-9]\d{7,8}$`, normalises to `+601…`.
    - `OrderLine`: `{ menu_item_id: slug, qty: int 1–20, notes?: trimmed ≤ 200 }`.
    - `CheckoutDetails`: name 2–80, phone, `fulfilment: 'pickup' | 'delivery'`, address required (≥ 10 chars) only for delivery and dropped for pickup.
    - `PlaceOrderRequest`: `CheckoutDetails` + `items: OrderLine[1..30]`. zod strips unknown keys, so a sneaky `price_cents` never reaches the DB.
  - `lib/schemas/order.test.ts`: valid pickup and delivery; delivery without address; phone formats (`012-345 6789` ok, `+60 11-2345 6789` ok, landline `0312345678` rejected); qty 0 and 21 rejected; extra price field stripped; empty items rejected.
- [ ] **2d** `refactor: seed script reuses the shared MenuItem schema`. `scripts/seed.ts` imports `../lib/schemas/menu`, so there is one definition of a menu item. Re-run seed + check-db.
- [ ] **2e** `feat: add server-only Supabase client and menu queries`.
  - `lib/env.ts`: zod-validated server env, read lazily so `next build` needs no secrets until code actually runs. ADMIN_PASSWORD min 8, with a clear error.
  - `lib/supabase/server.ts`: `import 'server-only'`, one client, no session persistence.
  - `lib/menu/queries.ts`: `getMenu()`, `getMenuItemsByIds()`. DB rows are parsed with `MenuItem`, so DB output gets validated too.

---

## Remaining build (steps 3–13)

### 3. Menu page
- [ ] `app/page.tsx`: static header + `<Suspense fallback={<MenuSkeleton/>}>` around an async `Menu`. `Menu` calls `await connection()`, then `getMenu()`: fresh data every request and no DB call at build time.
  - Grouped in `CATEGORIES` order, with anchor nav.
  - Cards show price, spice level, vegetarian tag and allergens.
  - Sold-out items are greyed out, with a "Sold out" badge and a disabled Add button.
- [ ] `app/layout.tsx`: metadata ("US · halal pizza in KL") + site header. `app/error.tsx`: friendly retry.
- [ ] `npx shadcn add skeleton separator`. Stop and ask if the CLI wants to install any npm package.
- Commits: `feat: menu page grouped by category`, `feat: menu loading and error states`.

### 4. Cart (localStorage) + cart sheet
- [ ] `lib/cart.ts` (pure) + `lib/cart.test.ts`:
  - `CartLine { id, name, price_cents, qty, notes? }`. Name and price are display copies only; `toOrderLines()` sends only ids/qty/notes.
  - Functions: `addItem` (merges by id, caps at 20), `setQty`, `setNotes`, `removeItem`, `subtotalCents`, `itemCount`.
- [ ] `lib/cart-store.ts` (client): localStorage as an external store read with `useSyncExternalStore`.
  - Empty cart on the server, real cart after hydration.
  - No `useEffect` + `setState`: `react-hooks/set-state-in-effect` is an error in this lint config.
  - Stored JSON is zod-checked; corrupt data becomes an empty cart.
  - The `storage` event gives cross-tab sync.
- [ ] `components/cart/add-to-cart-button.tsx` and `components/cart/cart-sheet.tsx`. The Sheet has qty −/+, notes, remove, and the subtotal labelled "estimate, final price confirmed at checkout". The Checkout link uses `render={<Link/>}` + `nativeButton={false}`. The header shows the cart count.
- Commits: `feat: cart helpers and localStorage store`, `feat: cart sheet with qty, notes and remove`.

### 5. Checkout + POST /api/orders + confirmation
- [ ] `lib/orders/queries.ts` (server-only): `placeOrder()` → `rpc('place_order', { p_customer_name, p_phone, p_fulfilment, p_address, p_items })`, plus `getOrder(id)`.
- [ ] `app/api/orders/route.ts`: parse JSON → `PlaceOrderRequest.safeParse` (422 + field errors) → RPC → 201 `{ id }`.
  - `Item unavailable:` → 409. `Unknown item:` and check violations → 422.
  - Anything else → 500 with a generic message; details are logged on the server only.
  - Never reads a price or total from the client.
- [ ] `app/checkout/page.tsx` + `components/checkout/checkout-form.tsx`:
  - Fields: name, phone, pickup/delivery radio, address shown for delivery.
  - Same zod schema on the client for instant feedback; the server re-validates.
  - Submit is disabled while pending, so no double orders.
  - Success → clear cart → `/orders/[id]`. A 409 shows "X is sold out, remove it".
- [ ] `app/orders/[id]/page.tsx`:
  - Suspense around the details (`params` is a Promise in Next 16). Non-UUID → `notFound()`.
  - Shows status, items at their snapshot `unit_price_cents`, the DB total and fulfilment.
  - Hides phone and address; the unguessable UUID link is the only "key".
  - A small client component calls `router.refresh()` every 15 s.
- [ ] shadcn: `label`, `textarea`, `radio-group`.
- Commits: `feat: POST /api/orders via place_order RPC`, `feat: checkout form with MY phone validation`, `feat: order confirmation page with live status`.

### 6. /admin
- [ ] `lib/admin/token.ts` (pure, tested):
  - `signSession(secret, expiresAt)` → `exp.hmacSHA256`.
  - `verifySession(token, secret, now)` uses `timingSafeEqual`.
  - The password check compares SHA-256 digests with `timingSafeEqual`.
- [ ] `lib/admin/session.ts` (server-only): an httpOnly cookie, `secure` in production, `sameSite: 'strict'`, 8 h.
- [ ] `app/admin/page.tsx`: Suspense → a gate reads the cookie → login form, or the orders table (latest 50, items, total, time, status select). `noindex`.
- [ ] `app/admin/actions.ts` (`'use server'`): `login`, `logout`, `updateOrderStatus`. Each action re-checks the cookie itself (Server Actions are public POST endpoints), zod-validates id + status, then refreshes `/admin` per the bundled Next docs.
- [ ] `lib/admin/token.test.ts`: valid, expired, tampered, wrong secret.
- Commits: `feat: signed admin session cookie`, `feat: admin login and order list`, `feat: admin order status updates`.

### 7. Chat route + tools + model fallback
- [ ] `lib/ai/models.ts`: `createFallbackModel(models)` using `wrapLanguageModel` middleware (`wrapStream` + `wrapGenerate`).
  - If a model fails **before the first token** with a retryable `APICallError` (429/5xx/overloaded), the next model gets the same params.
  - Non-retryable errors (400) are re-thrown.
  - `lib/ai/models.test.ts` uses `MockLanguageModelV4` from `ai/test`: 503 → backup used; 400 → no fallback; all fail → throws.
- [ ] `lib/ai/prompt.ts`: the system prompt (name = "US").
- [ ] `lib/menu/search.ts` (pure) + tests: query, category, max price, max spice, vegetarian, exclude allergens.
- [ ] `lib/ai/tools.ts`: `createTools({ cart })` per request (closure). The SDK validates every input with zod.
  - `search_menu`, `get_item`: facts from the DB only, including the sold-out flag.
  - `add_to_cart({ menu_item_id, qty, notes })`: re-checks the DB (exists, available, qty cap), then returns `{ ok: true, action: { type: 'add', item: { id, name, price_cents }, qty, notes } }` or `{ ok: false, reason }`. There is no price input.
  - `view_cart`: re-prices the client's cart from the DB.
  - `go_to_checkout`: returns `{ ok: true, action: { type: 'navigate', href: '/checkout' } }`.
  - **No place-order tool exists.**
- [ ] `app/api/chat/route.ts`:
  - zod body `{ messages (≤ 30), cart (≤ 30 lines) }`, then `validateUIMessages`.
  - `streamText({ model, instructions, messages: await convertToModelMessages(…), tools, stopWhen: isStepCount(5), maxRetries: 1 })`.
  - Response: `createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream, originalMessages, onError: () => 'Assistant is busy, please try again.' }) })`.
  - The real error is logged on the server.
- Commits: `feat: model fallback wrapper`, `feat: menu search helper`, `feat: chat tools with server-side validation`, `feat: streaming /api/chat route`.

### 8. Chat widget wired to the cart
- [ ] `npm i @ai-sdk/react@4.0.167` (approved).
- [ ] `components/chat/chat-widget.tsx`, mounted in the root layout so it's on every page and the conversation survives navigation.
  - Floating button → Sheet. `useChat({ transport: new DefaultChatTransport({ api: '/api/chat' }), onFinish })`.
  - `sendMessage({ text }, { body: { cart } })`: the cart is read at send time, because a hook-level body would be stale.
- [ ] `onFinish` applies cart actions, deduped by `toolCallId`:
  - `tool-add_to_cart` with `ok: true` → cart store.
  - `tool-go_to_checkout` → close the sheet + `router.push('/checkout')`.
- [ ] UI: tool chips ("Added 2 × Margherita", "Sold out"), typing state, Stop, an error banner "Assistant is busy, please try again" + Retry (`regenerate`), starter prompts (EN / BM / 中文).
- Commits: `feat: chat widget with streaming replies`, `feat: apply chat cart actions and checkout handoff`.

### 9. Eval script + fix failures
- [ ] `scripts/eval.ts`: black-box against `EVAL_BASE_URL` (default `http://localhost:3000`; also run against the live URL).
  - Posts to `/api/chat`, reads the stream with `readUIMessageStream`, and checks the text + tool calls against `data/menu.json`.
  - Runs cases one at a time with a pause, because of free-tier rate limits.
  - 10 cases:
    1. Discount request
    2. Prompt injection
    3. Not on menu (sushi)
    4. Sold out (truffle-mushroom → no successful add)
    5. Non-spicy (only spicy_level 0)
    6. Seafood allergy (no sambal-prawn, seafood-marinara or caesar-salad; suggests asking staff)
    7. Vegetarian (only vegetarian-tagged items)
    8. Under RM5 (only coca-cola or mineral-water)
    9. Reply in BM
    10. Off-topic
  - Global check: every "RM x.xx" in a reply is a real menu price or a view_cart total.
- [ ] Fix failures through tool descriptions and outputs (the prompt stays as-is). Record the results in the README.
- Commits: `test: add chat eval with 10 guardrail cases`, then one `fix: …` per failure.

### 10. Polish
- [ ] Mobile layout (chat sheet from the bottom on small screens), loading/empty/error states, a11y labels, favicon + metadata.

### 11. Unit tests
- [ ] Fill the gaps (search, the pure parts of the tools). `npm run check` green.

### 12. README + .env.example check
- [ ] Sections:
  - what it is, live link, Mermaid architecture diagram, setup
  - key decisions
  - data design: cents, slugs, unit price snapshot, RPC transaction, RLS deny-all + server-only key
  - AI usage: tools, fallback, guardrails, eval table
  - security model
  - what's next: size variants, payments, accounts, rate limits, idempotency keys, realtime status, `use cache` for the menu, admin brute-force protection, Playwright e2e

### 13. Final
- [ ] Incognito run on the live URL: order → admin → status change.
- [ ] Re-run the Step 0 secret scan.
- [ ] 2–3 min demo script.

**Nice-to-have (only if ahead):** order lookup by ID in chat (status only, no personal details), rate limit on `/api/chat`, a 中文 eval case.

---

## Risks
1. **AI SDK 7 differs from older examples.**
   - `instructions` (not `system`), `isStepCount` (not `stepCountIs`).
   - `toUIMessageStream` + `createUIMessageStreamResponse`; the result helpers are deprecated.
   - `convertToModelMessages` is async.
   - `useChat` lives in `@ai-sdk/react` with `DefaultChatTransport`. ESM-only.
   - Mitigation: read `node_modules/ai/docs` before each AI commit.
2. **Fallback only covers failures before the first token.** A failure mid-stream → "busy" + Retry. Free-tier 429s → the eval is paced. Gemini "thinking" adds latency.
3. **Base UI vs Radix:** use `render`, never `asChild`. Link-styled buttons need `nativeButton={false}`. Sheet is a Base UI Dialog (`open`/`onOpenChange`). Copy the base-nova registry examples.
4. **Cache Components:** DB reads, `params` and `cookies()` must sit inside `<Suspense>` (or `'use cache'`), and `export const dynamic` isn't allowed. These fail at **build** time, not at lint → `npm run build` for every page feature.
5. **Supabase:**
   - Auto-expose is off, so any new table or function needs explicit grants.
   - A stale schema cache is fixed with `notify pgrst, 'reload schema';`.
   - RPC argument names must match `p_*`.
   - Free-tier projects pause after about a week idle; check before submitting.
6. **Vercel env:** names must match exactly (watch the SUPABASE_SERVICE_ROLE_KEY rename). Set them for Production (+ Preview). Changing env vars needs a redeploy.
7. **"US" can be misread as the country.** It's quoted in the prompt, and the eval watches for it.
8. **Gemini likes markdown,** but the chat renders plain text (no markdown dependency). If asterisks look bad, I'll ask before adding a formatting line to the prompt.

## Verification
- **Per commit:** `npm run lint`, `npx tsc --noEmit`, `npm test` (from 2a). Page features also run `npm run build`.
- **Data:** `npx tsx --env-file=.env.local scripts/check-db.ts` → 24 rows, 2 unavailable, zero drift.
- **AI:** `scripts/test-ai.ts` (each model answers) and `scripts/eval.ts`, locally and on the live URL.
- **End-to-end** (dev, then live in incognito):
  1. Menu loads, sold-out items disabled; add items.
  2. Chat "add 2 margherita" → cart updates.
  3. Checkout rejects a bad phone; place the order.
  4. Order page shows it.
  5. /admin login → change status → order page updates.
- **Final secret scan:** the same `git log -p --all | grep -cE …` counts as Step 0, all 0.
