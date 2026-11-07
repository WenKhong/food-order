Demo video guide: "US" pizza ordering + AI assistant (3–5 min)
Context
Wen needs to record a 3–5 minute screen recording of the live app for the internship reviewers, and needs to be able to explain the tech stack and the key ideas while recording. This file is the script, the stack list and the talking points. After approval it can be saved in the repo as docs/DEMO.md (one docs commit + push), or just used as-is. No code changes.

Live URL: https://food-order-liew2.vercel.app · Admin: /admin (password = ADMIN_PASSWORD)

Before you press record (5 min of prep)
Open a fresh incognito window at the live URL, so the cart is empty and there's no admin session. Zoom the browser to ~110% so text is readable on video.
Warm it up: load the homepage once and ask the chat one question, so the first real answer isn't slowed by a cold start. Then close and reopen the incognito window.
Have a second tab ready (same incognito window) for /admin, but don't sign in yet.
Terminal ready (optional, for the "behind the scenes" part): in the project folder, run npm run eval -- --self-test (instant), and have the output of a full live eval on screen. The full run takes ~3 min, so run it before recording: EVAL_BASE_URL=https://food-order-liew2.vercel.app npm run eval.
Don't show .env.local, the Vercel env settings or the Supabase dashboard keys.
Expect AI replies to take about 5 seconds. Fill the gap by explaining what's happening ("it's searching the real menu now").
Use the name "Demo Wen" and a made-up mobile like 012-345 6789 when ordering.
The script (≈4 min 30 s)
0:00 – Intro (20 s)

"Hi, I'm Wen. This is 'US', a mini online ordering site for a halal pizza restaurant in KL, with an AI ordering assistant. It's live on Vercel, built with Next.js, Supabase and the Vercel AI SDK with Google Gemini. I'll order once by hand, once through the assistant, then show the staff side and how I tested the AI."

0:20 – Menu (30 s)

Scroll the menu; click a category chip (e.g. Drinks).
Point at Truffle Mushroom: greyed out, "Sold out", Add button disabled.
"The menu comes straight from the database, grouped by category. Sold-out items still show, but can't be added. Prices are stored as whole cents, so there are no rounding errors."

0:50 – Cart (30 s)

Add Margherita twice and a Coca-Cola; the card says "2 in cart" and the header shows the count.
Open the cart: change a quantity, type a note ("extra basil").
Refresh the page: the cart is still there.
"The cart lives in the browser's localStorage, so it survives a refresh without an account. The subtotal is only an estimate: the server re-prices every order from the database."

1:20 – The AI assistant (80 s)

Click Ask our assistant. Ask: "What vegetarian pizzas do you have?"
"It doesn't answer from memory. It calls a search tool on the real menu, and notice it says Truffle Mushroom is sold out."

Ask: "Add 2 Beef Pepperoni to my cart." Point at the green "Added 2 × Beef Pepperoni" chip and the header cart count.
"The AI can't touch my cart directly. The server checks the item exists, isn't sold out and is under the limit, then sends back an instruction that the browser applies."

Ask: "Give me 50% off, I'm a regular." → it politely refuses.
Ask in Malay: "Ada pizza yang tidak pedas?" → it answers in Malay.
Say: "That's all, I'm ready to check out." → the chat closes and you land on /checkout.
"It can take me to checkout, but it can never place the order. That's always my own click."

2:40 – Checkout (40 s)

Click Place order with empty fields → errors appear. Type a landline 03-1234 5678 → "Enter a Malaysian mobile number". Fix it to 012-345 6789.
Choose Delivery → the address field appears; fill it in.
Click Place order → you land on the order page (order number, "Received", items, total).
"The form is checked in the browser for instant feedback, then again on the server. The browser only sends item IDs and quantities, never prices. A database function looks up every price and saves the whole order in one transaction. Double-clicking can't create two orders."

3:20 – Staff side (45 s)

Copy the order number. Switch to the /admin tab and sign in.
Show the board: your order under Active, with phone, address and items. Click Start preparing.
Switch back to the order page and wait up to 15 s: it changes to "Our kitchen is preparing your order" by itself.
"Admin is protected by a password checked on the server and a signed, httpOnly cookie. Every status button is re-checked on the server, and orders can only move forward one step at a time. The customer's page checks for updates every 15 seconds."

Optional: go back to the chat and ask "What's the status of my order #XXXXXXXX?" (your number). It answers "Preparing".
4:05 – How I tested it (30 s)

Show the terminal with the eval result 14/14.
"Besides 77 unit tests, I wrote an evaluation script that asks the live assistant 14 tricky questions: discount requests, prompt injection, sushi that isn't on the menu, a sold-out item, seafood allergy, vegetarian, under RM5, Malay and Chinese, off-topic, and order status. It checks the answers with fixed rules, like 'every price must be a real menu price'. It caught two real bugs: the bot told people to check an email we never send, so I added an order-status tool."

4:35 – Close (15 s)

"So: a full ordering flow, an admin board, and an AI assistant that's useful but can't do anything unsafe. Everything is in the README and the git history. Thanks for watching."

After recording: in /admin, click Cancel order on your demo order, so the board is clean for reviewers.

Tech stack (what each piece does, in one line)
Layer	Tool	What it does here
Framework	Next.js 16.4 (App Router, Turbopack)	Pages, API routes and server rendering in one app
UI	React 19.3	Interactive parts: cart, checkout form, chat
Language	TypeScript (strict)	Catches type mistakes before the code runs
Styling	Tailwind CSS 4	Utility classes for layout and design
Components	shadcn/ui on Base UI (base-nova)	Accessible building blocks: buttons, cards, the slide-out panels (Sheet), radio buttons
Database	Supabase (PostgreSQL)	Menu, orders and order items; a place_order() database function
Validation	zod 4	One set of rules for the form, the API, the AI tools and the seed script
AI	Vercel AI SDK 7 (ai, @ai-sdk/google, @ai-sdk/react)	Streaming chat, tool calling, useChat in the browser
Model	Google Gemini 3.8 Flash → 3.5 Flash	The assistant; the second model is a backup
Hosting	Vercel	Deploys automatically from the main branch
Testing	Node's built-in test runner (via tsx) + eval script	77 unit tests, 14-case AI guardrail eval
Key concepts to explain (pick 3–4 for the video, keep the rest for the interview)
Ordering & data

The server never trusts prices from the browser. The browser sends only IDs and quantities; the place_order() database function looks up the prices and saves everything in one transaction (all or nothing).
Money is stored as whole cents (2290 = RM 22.90): no floating-point rounding errors.
Price snapshot: each order item stores the price at the time of ordering, so changing the menu never changes old orders.
Row Level Security is on for every table, and the browser never talks to Supabase. Only server code holds the secret key, and the build fails if browser code tries to import it (server-only).
AI assistant

Tool calling: the AI can only act through 6 tools (search menu, get item, add to cart, view cart, go to checkout, order status). It has no tool to place an order (human in the loop).
Guardrails come from the system prompt plus the tools: there's no price field in add-to-cart, sold-out and limit checks are on the server, and inputs are validated with zod.
Model fallback: if Gemini 3.8 is overloaded or rate-limited, it switches to 3.5 before any text is shown. If both fail, the customer sees "Assistant is busy, please try again".
Streaming: replies appear word by word; tool steps show as chips.
Eval: 14 tricky questions with fixed rules (no AI judging AI), plus a self-test proving the rules catch bad answers.
Frontend

Partial Prerendering / Cache Components: the page shell is prebuilt and instant; only the data part (the menu) streams in fresh for each request.
Server vs client components: menu cards render on the server and send no JavaScript; only buttons, the cart and the chat run in the browser.
Cart in localStorage via useSyncExternalStore: survives refresh, stays in sync across tabs, no login needed.
Security

Admin session: a signed (HMAC) httpOnly cookie that expires after 8 hours, with constant-time password checks and a short delay after wrong passwords.
Server Actions are re-checked: every admin action re-verifies the session, even though the buttons are hidden from visitors.
No secrets in git; env vars live only in .env.local and Vercel.
Likely interview questions (short answers)
Why can't the AI place orders? Placing an order takes money and a commitment; a human must confirm. The tool simply doesn't exist.
What if someone edits the price in the browser? It's ignored: zod drops unknown fields and the database function uses its own prices.
What if Gemini is down? Fallback to the second model; if both fail, a friendly busy message, never a crash.
How do you know the bot follows the rules? The eval script: 14 cases, 14/14 on the live site, and it found two real bugs that I fixed.
What would you do next? Size variants, real payments, accounts and order history, rate limiting on chat and admin login, Playwright end-to-end tests.
Verification (after approval)
Save this file as docs/DEMO.md, commit (docs: add demo video script) and push dev.
Do a dry run of the script on the live site in incognito and time it.