# Project: food-order

Mini online food-ordering web app with an AI ordering assistant, for "US", a halal
pizza restaurant in Kuala Lumpur (our own made-up menu; no company data was supplied).
24-hour take-home for an internship application. The reviewer will read the code,
the README, and the git history. I (Wen) must be able to explain every line.
Build plan and progress: `docs/PLAN.md`.

## Stack
- Next.js (App Router) + TypeScript (strict)
- Tailwind CSS + shadcn/ui using **Base UI, not Radix**. Use the `render` prop, never `asChild`. Check shadcn docs for Base UI examples.
- Supabase Postgres via `@supabase/supabase-js`, **server-side only**
- Vercel AI SDK (`ai` + `@ai-sdk/google`) for chat streaming and tool calling
- zod for all validation
- Deployed on Vercel (auto-deploys from `main`)

## Environment variables (in .env.local, never committed)
- GOOGLE_GENERATIVE_AI_API_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY (new `sb_secret_` key, not legacy service_role JWT)
- ADMIN_PASSWORD
Never prefix any of these with NEXT_PUBLIC_. Never hardcode secrets. Keep .env.example in sync (names only).

## Database rules
- Data API tables are NOT auto-exposed and RLS is ON for every table.
- The browser never talks to Supabase. All DB access goes through server code (route handlers / server components) using SUPABASE_SERVICE_ROLE_KEY.
- Every migration that creates tables ends with:
  `grant select, insert, update, delete on all tables in schema public to service_role;`
- Money is stored as integer cents (`price_cents`, `total_cents`). Never floats.
- The schema is designed around our own menu (`data/menu.json`). Use the same field names in code and AI tools.

## Security rules (non-negotiable)
- The server recomputes every price and total from the DB. Never trust totals from the client or the LLM.
- Validate every API input and every AI tool input with zod.
- /admin is protected by ADMIN_PASSWORD (checked server-side).
- The AI can add to cart and send the user to checkout. It can NEVER place an order. Only the user's click does (human-in-the-loop).

## AI rules
- Model fallback order: `gemini-3.8-flash`, then the backup in `lib/ai/models.ts`. On 503/overload, fail over. If all fail, the UI shows "Assistant is busy, please try again" instead of crashing.
- Tools: search_menu, get_item, add_to_cart (returns a cart action the client applies), view_cart, go_to_checkout.
- The bot only mentions items returned by tools. No invented items, prices, ingredients, or halal/allergy claims.
- Check the current AI SDK docs before writing chat or tool code; APIs change between versions.

## Data
- No company data was given. The menu is our own: `data/menu.json` (24 items, single 10-inch size).
- `scripts/seed.ts` validates every row with zod, then upserts by `id` (safe to run twice).
- Validation is all-or-nothing: one bad row stops the seed, so we never load a partial menu or guess a value.
- To retire an item, set `is_available = false` instead of deleting it (past orders reference it).
- Every data issue and how it was handled goes into DATA_NOTES.md.

## How to work with me
1. Plan first. Show me the plan before writing code.
2. Small diffs: one feature per commit, conventional commits (feat:, fix:, chore:, test:, docs:).
3. After each feature run: `npm run lint`, `npx tsc --noEmit`, and the tests.
4. After each diff, explain in plain English what changed and why, so I can defend it in an interview.
5. Prefer simple, readable code over clever code. No new dependencies without asking.
6. Don't build: user accounts, real payments, microservices.

## Commands
- Dev server: `npm run dev`
- Type check: `npx tsc --noEmit`
- Lint: `npm run lint`
- Run a script: `npx tsx --env-file=.env.local scripts/<name>.ts`
- Unit tests: `npm test` (Node's built-in test runner via tsx; files are `lib/**/*.test.ts`)
- After every feature: `npm run check` (lint + type check + tests)