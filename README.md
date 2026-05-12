# AdTestLab

A diagnosis workspace for media buyers: feed in daily campaign and adset metrics, get a rules-based verdict on what's working, what's broken, and what to fix — backed by an AI-written explanation when you want depth.

## What it is

After ads launch, the question stops being "is this worth testing?" and starts being "what is actually happening and what should I do next?" Spreadsheets don't answer this — they show you the numbers but not the decision. Triple Whale and similar tools tell you about profit at the store level, not at the test level. AdTestLab is the layer that turns daily campaign/adset data into a clear verdict per test: KILL, FIX_OFFER, FIX_LP, FIX_CREATIVE, CHECKOUT_ISSUE, CONTINUE, NEED_MORE_DATA.

The product runs a pure rule engine on the metrics first — deterministic, predictable, fast — and then optionally calls Claude to write a one-paragraph diagnosis explaining the verdict in plain English with a recommended action. The AI is a layer on top of the rules, not a substitute for them.

It sits next to its sibling, ProductTestLab, which handles the pre-launch side (deciding what to test and how to position it). Together they close the loop: hypothesis → spend → verdict → next hypothesis.

## Status

Working. Used in production by the author. What works today:

- Email/password and Google auth, single-user
- Products → campaigns → adsets hierarchy, all under `users/{uid}/...`
- Daily entries for both campaign and adset levels, keyed by `YYYY-MM-DD` for clean upserts
- Profit-aware metrics (revenue net of transaction fees, shipping, refund allowance) — derived in pure functions in `lib/metrics/*`
- Verdict engine: declarative rule set in `lib/verdict-engine/rules/*` (data-sufficiency, kill, landing-page, offer, checkout, creative) aggregated into one verdict with a triggered-rule trace
- AI diagnosis via Anthropic Claude Sonnet 4.5 on top of the verdict — cached per (input hash, date range, adset breakdown) so repeating the same diagnosis is free
- Per-user daily quota on AI diagnoses (5 / day) and a global monthly Anthropic budget cap with automatic short-circuit when exceeded
- Feedback widget that writes to `feedback/*` via an admin-SDK route (denied to clients)
- Dark/light theme (warm dark default), responsive shell

What's not in this codebase yet:

- Multi-user / team features
- Webhook for ProductTestLab integration (pushing actual KPIs back into a hypothesis)
- Meta/Shopify API ingestion (data is entered manually for now)
- More verdict rules calibrated against larger sample sizes

## How it works

The data model is a hierarchy: a product has campaigns, a campaign has adsets, and both campaigns and adsets accept daily entries keyed by date. Entries store the raw counters — spend, revenue, clicks, landing page views, ATCs, ICs, orders — plus optional fee/shipping/refund overrides.

The product page shows a date-range-scoped roll-up of every campaign, with the rule engine's verdict already evaluated. Open a campaign and you get the same view at adset granularity. Open a campaign or adset and click "Diagnose with AI" and a route handler builds a structured prompt from the totals + per-adset breakdown, calls Claude with a long system prompt that encodes the diagnostic framework, parses the JSON response against a Zod schema, and caches the result under that campaign's `diagnoses/` subcollection. Subsequent diagnoses on identical inputs return the cached version unless the user passes `force: true`.

The rule engine itself is intentionally simple — six categories, each a pure function that takes a verdict-input shape and returns either a verdict or `null` (rule did not fire). An aggregator combines them, returning the highest-priority verdict plus the rule name that triggered it. The engine is fully unit-tested; its threshold constants are calibrated by hand and live in `lib/verdict-engine/thresholds.ts`.

The AI does not adjudicate the verdict — it explains it. The system prompt is given the inputs *and* the rule-engine output, then asked to produce a summary, primary issue, recommended action, and confidence level. This separation keeps the deterministic decision auditable and the prose layer disposable.

## Quick start

Requirements:

- Node.js ≥ 20.9
- A Firebase project with Firestore + Email/Password and Google providers enabled
- An Anthropic API key
- A Resend API key (only if you want the feedback notification email — optional)

```
git clone <repo> ad-test-lab && cd ad-test-lab
nvm use
npm install
cp .env.example .env.local
# Fill Firebase web + admin keys, ANTHROPIC_API_KEY, RESEND_API_KEY (optional)
firebase deploy --only firestore:rules
npm run dev
```

Open http://localhost:3000, sign up, add a product, add a campaign under it, add adsets, enter daily data, and click "Diagnose with AI" when you want a verdict explanation.

Scripts:

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run lint` — ESLint check
- `npm run type-check` — `tsc --noEmit`
- `npm run test` — Vitest (covers `lib/metrics`, `lib/utils`, `lib/verdict-engine`, `lib/claude`)
- `npm run test:engine` — just the verdict engine
- `npm run test:coverage` — with coverage report

## Stack

Framework: Next.js 16 (App Router, RSC, route groups), React 19, TypeScript strict.

Styling: Tailwind CSS v4 (CSS-first, tokens in `app/globals.css` under `@theme inline`). shadcn primitives on `@base-ui/react`. `clsx` + `tailwind-merge`. `sonner` toasts. `recharts` for the trend charts. `@tanstack/react-table` for the entries tables. `lucide-react` icons. Warm-dark default theme with explicit light variant.

Data: Firebase Web SDK on the client, Firebase Admin SDK on the server. Real-time reads via `react-firebase-hooks/firestore`. No external state library — collection state flows through small custom hooks per entity (`useCampaigns`, `useAdsetEntries`, `useDiagnose`, etc.). Per-user nesting under `users/{uid}/...`, daily entry doc IDs are `YYYY-MM-DD` strings so writes upsert cleanly.

Forms: `react-hook-form` v7 with `@hookform/resolvers/zod`. Schemas in `types/*.ts` are reused by forms and API validators.

AI: Anthropic SDK calling Claude Sonnet 4.5, non-streaming, JSON-via-prompt structured output. One endpoint: `app/api/diagnose/route.ts`. Cost tracked per call in `system/budget/months/{YYYY-MM}`; per-user daily quota in `users/{uid}.diagnosesUsedToday` via a Firestore transaction. Diagnoses cached at the campaign level.

Email: `resend` for the feedback notification (admin route only).

Testing: Vitest with `@vitest/coverage-v8`. Heaviest in `lib/verdict-engine/__tests__/` because that's where correctness matters most.

## Architecture

```
app/
  (app)/            # authenticated route group
    layout.tsx
    page.tsx        # product list / pipeline
    products/[id]/page.tsx
    products/[id]/campaigns/[campaignId]/page.tsx
  (auth)/login/page.tsx
  api/
    diagnose/route.ts   # POST: rule engine + AI diagnosis + caching
    feedback/route.ts   # POST: writes feedback via admin SDK
  layout.tsx        # root + theme bootstrap + Toaster
  globals.css

components/
  ui/               # shadcn primitives
  forms/            # ProductForm, CampaignForm, NewProductDialog, EditProductDialog, BackfillDialog, etc.
  charts/           # CPATrendChart, SpendVsRevenueChart, AdsetTrendChart
  tables/           # CampaignEntriesTable, AdsetEntriesTable, CollapsibleEntriesTable
  verdict/          # AIDiagnosisPanel, DiagnosisCard, VerdictBadge, StickyVerdictBar
  icons/            # GoogleIcon, BmcIcon
  Sidebar.tsx, Breadcrumbs.tsx, ProductCard.tsx, CampaignCard.tsx, AdsetCard.tsx, StatusMenu.tsx, …

hooks/
  use{User,Login,AuthBootstrap}.ts
  use{Products,Product,Campaigns,Campaign,Adsets,Adset}.ts
  use{CampaignEntries,AdsetEntries,AllAdsetEntries,CampaignEntryMutations,AdsetEntryMutations,EntriesTableController,ExpandedTable,GridNavigation}.ts
  useDiagnose.ts, useCampaignDiagnoses.ts, useVerdict.ts
  useDateRangePreset.ts, useTheme.ts, useSidebarPin.ts, usePointerCoarse.ts

lib/
  firebase/         # init, paths, converters, per-collection services + budget + usage
  claude/           # client, prompts, parse, schema, diagnose, orientation
  metrics/          # pure computations: cpa, ctr, roas, profit, profitWithFees, atcRate, lpvRate, …
  verdict-engine/   # rules/ + aggregate + thresholds
  email/            # resend + feedbackNotification
  utils/            # formatCurrency, formatPercent, formatDate, hash, threshold-color, …
  utils.ts          # cn() helper

types/              # zod schemas + inferred types
  index.ts re-exports the rest
```

The verdict engine is the brain. The Claude layer is a polish on top. The data layer enforces per-user isolation. The UI just renders what the brain decides. See `.claude/skills/architecture/SKILL.md` for the canonical architectural rules and constraints used by both this project and its sibling.

## Key design decisions

**Verdict engine is pure.** Every rule is a function from inputs to verdict or null. No I/O, no side effects, no async. This makes the engine cheap to test and impossible to break by environment. The same engine runs both server-side (inside the diagnose route) and indirectly (the UI displays the verdict the route returned).

**AI explains, never decides.** Claude is given the rule-engine output as part of its input, and tasked with writing prose around it. The rule output is the truth; the AI text is the bedside manner. If the AI is removed, the verdict still works.

**Daily entries are upserts, not inserts.** Each daily entry has its doc ID equal to its date (`YYYY-MM-DD`), so the same `setDoc` call works whether the user is filling for the first time or editing yesterday's row. Spreadsheet semantics, Firestore implementation.

**No stored computed fields.** Profit, CPA, ROAS — all derived from raw counters at read time in `lib/metrics/*`. The only "computed" things in Firestore are aggregations that explicitly need atomic increments (monthly spend, daily diagnosis usage). This keeps Firestore documents idempotent and prevents drift between data and derived numbers.

**JSX is UI only.** Business logic lives in `lib/`. Components import metrics, never compute them inline. The verdict engine is reachable from a route handler and from tests; it never reaches into React.

**Per-user quota + global cap.** A user can run five AI diagnoses per day; the global Anthropic monthly budget caps at $18 (10% under the Anthropic console limit, set in `lib/firebase/budget.ts`). The route handler refunds the daily quota on upstream failures so users aren't punished for Anthropic outages.

**No password reset, no email verification.** Not because they're not valuable, but because they weren't blocking real usage and adding them would require email infrastructure for a single-user product. They'll come when teams come.

**Theme is set synchronously before paint.** A tiny inline script in `app/layout.tsx` reads `localStorage.theme` and sets `<html class="dark">` or `<html class="light">` before React mounts, so there's no flash. `next-themes` is in the deps but the codebase uses a homegrown sync script for the same reason.

## Roadmap

Built and deployed:

- Auth (email/password + Google)
- Product → campaign → adset hierarchy
- Daily entries with profit-aware metrics
- Six-category verdict engine with calibrated thresholds
- AI diagnosis with caching, daily quota, monthly budget cap
- Feedback widget
- Responsive shell with dark/light themes

Near-term:

- Webhook endpoint for ProductTestLab to push actual KPIs into a hypothesis (closes the cross-product loop; the schema field `linkedAdTestLabId` is already on the PTL side)
- Engine threshold tuning as real-world data accumulates
- One or two more verdict rules (refund-rate spike, day-2 frequency drop) once the data warrants

V2:

- Meta API ingestion (replace manual daily entry for users who allow it)
- Shopify revenue ingestion
- Team / shared workspace
- Public anonymized benchmarks across niches (calibration data)

## Related projects

- **[ProductTestLab](../product-test-lab/)** — sibling project for pre-launch strategy. Same stack, separate Firebase project, separate domain. The four design/code/firebase/AI conventions used by both products were originally extracted from this codebase into `.claude/skills/*` and ported. Cross-product integration in V2 is planned through API calls, not shared infrastructure.

## License

Private / unlicensed during development.
