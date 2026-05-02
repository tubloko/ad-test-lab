---
name: adtestlab-architecture
description: AdTestLab project architecture, folder structure, data model, and tech stack. Use this skill at the start of any AdTestLab task, when creating new files, when deciding where code belongs, or when the user mentions architecture, structure, data model, Firestore schema, or routing. Read this BEFORE writing any code in this project.
---

# AdTestLab Architecture

The North Star document. Read first, always.

## Product Summary

A decision tool for Shopify founders running Meta ad tests. Users enter daily ad/store numbers; the app computes funnel metrics and outputs a verdict: KILL, CONTINUE, FIX_CREATIVE, FIX_LP, FIX_OFFER, CHECKOUT_ISSUE, or NEED_MORE_DATA.

## Tech Stack (locked, do not deviate)

- **Frontend:** Next.js 16 App Router, TypeScript, Tailwind, shadcn/ui
- **Backend:** Firebase (Auth + Firestore)
- **AI:** Claude Sonnet 4.5 via `@anthropic-ai/sdk` in Next.js API routes
- **Forms:** react-hook-form + zod
- **Data fetching:** react-firebase-hooks (`useCollection`, `useDocument`)
- **Charts:** recharts
- **Tables:** @tanstack/react-table
- **Tests:** vitest

Do NOT add: Redux, Zustand, tRPC, Prisma, Supabase, or any state library. React state + Firestore hooks are sufficient.

## Folder Structure (canonical)

```
adtestlab/
├── app/                        # Next.js App Router only — pages, layouts, API routes
│   ├── (auth)/login/
│   ├── (app)/                  # protected routes
│   │   ├── layout.tsx          # auth guard + sidebar
│   │   ├── page.tsx            # dashboard
│   │   └── products/
│   │       ├── new/
│   │       └── [id]/
│   │           ├── edit/
│   │           └── adsets/[adsetId]/
│   └── api/diagnose/route.ts
├── components/
│   ├── ui/                     # shadcn primitives, never edit directly
│   ├── forms/                  # ProductForm, AdsetForm, EntryForm
│   ├── tables/                 # EntryTable, ProductsTable
│   ├── charts/                 # SpendVsRevenueChart, CPATrendChart
│   └── verdict/                # VerdictBadge, AIDiagnosisPanel
├── lib/
│   ├── firebase/               # config.ts, auth.ts, firestore helpers
│   ├── claude/                 # client.ts, prompts.ts
│   ├── verdict-engine/         # PURE TS — see verdict-engine skill
│   ├── metrics/                # pure functions: ctr(), cpa(), roas()
│   └── utils/                  # formatCurrency, formatDate, hash
├── types/                      # shared TS types — single source of truth
├── hooks/                      # useUser, useProduct, useEntries
└── __tests__/
```

## Where Things Belong (decision rules)

| What you're building | Where it goes |
|---|---|
| A page (URL route) | `app/...` |
| A reusable UI piece | `components/...` (NEVER in `app/`) |
| Pure calculation (no React, no Firebase) | `lib/metrics/` or `lib/verdict-engine/` |
| Firestore read/write helper | `lib/firebase/` |
| Claude API call | `lib/claude/` + `app/api/diagnose/route.ts` |
| Custom React hook | `hooks/` |
| Type definition shared across files | `types/` |

**Rule:** if you're tempted to put logic in a `.tsx` file, stop. JSX files are UI only. See the code-quality skill.

## Data Model (Firestore)

All user data lives under `users/{uid}/...`. This makes security rules trivial.

```
users/{uid}                                              // user profile
users/{uid}/products/{productId}                         // product
users/{uid}/products/{productId}/adsets/{adsetId}        // adset
users/{uid}/products/{productId}/entries/{YYYY-MM-DD}    // product daily entry
users/{uid}/products/{productId}/adsets/{adsetId}/entries/{YYYY-MM-DD}  // adset daily
users/{uid}/products/{productId}/diagnoses/{diagnosisId} // cached AI diagnoses
```

**Critical conventions:**
- Daily entry document IDs are date strings `"YYYY-MM-DD"` — prevents duplicate-day entries
- `createdAt` and `updatedAt` are Firestore timestamps
- All money values are numbers in USD (no multi-currency in MVP)
- Computed fields (CTR, CPA, ROAS, profit) are NEVER stored — always computed on read

See `references/data-model.md` for full field schemas.

## Routing Conventions

- `(auth)` group → unauthenticated pages (login)
- `(app)` group → authenticated pages, layout enforces auth
- Dynamic segments use `[id]`, `[adsetId]` — never `[slug]` or generic names
- API routes live ONLY at `app/api/diagnose/route.ts` — no other API routes for MVP

## State Management Rules

1. **Server state** (Firestore): use `useCollection` / `useDocument` from `react-firebase-hooks`. Never duplicate Firestore data into local state.
2. **Form state**: `react-hook-form` only. No controlled inputs with `useState`.
3. **UI state** (modals, tabs, toggles): `useState` in the closest component.
4. **Global state**: doesn't exist in MVP. If you think you need it, you're wrong — lift state up or pass via props.

## Currency, Dates, Time Zones

- **Currency:** USD only. Format with `formatCurrency` from `lib/utils/`.
- **Dates:** stored as `"YYYY-MM-DD"` strings. Use `lib/utils/date.ts` helpers.
- **Time zone:** user's local timezone. Store on user document. Don't try to be clever with UTC conversions — display in user's TZ.

## Reference Files

- `references/data-model.md` — full Firestore schemas with every field
- `references/decision-log.md` — architecture decisions and why

When in doubt about *where* something goes, refer to "Where Things Belong" above. When in doubt about *how* to write it, see the code-quality skill.
