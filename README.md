# AdTestLab

A decision tool for Shopify founders running Meta ad tests. Enter daily ad and store numbers, get a verdict (KILL, CONTINUE, FIX_CREATIVE, FIX_LP, FIX_OFFER, CHECKOUT_ISSUE, NEED_MORE_DATA) plus an AI-written diagnosis.

## Tech Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- shadcn/ui primitives
- Firebase Auth + Firestore
- Anthropic Claude (server-side, via `/api/diagnose`)
- react-hook-form + zod for forms
- react-firebase-hooks for live data
- recharts for charts
- @tanstack/react-table for tables
- vitest for tests

## Getting Started

```bash
git clone <repo-url> ad-test-lab
cd ad-test-lab
npm install
cp .env.example .env.local   # then fill in real values
npm run dev
```

Open http://localhost:3000.

You will need:
- A Firebase project with Authentication (Google provider) and Firestore enabled
- A Firebase Admin service account JSON (for server-side auth in API routes)
- An Anthropic API key

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript check, no emit |
| `npm test` | Watch-mode tests (vitest) |
| `npm run test:run` | One-shot test run |
| `npm run test:engine` | Run only verdict engine tests |
| `npm run test:coverage` | Coverage report (lib/ only) |

## Project Structure

See `.claude/skills/architecture/SKILL.md` for the canonical architecture and folder layout. Key rules:

- JSX/TSX files contain UI only — business logic lives in `lib/`
- The verdict engine in `lib/verdict-engine/` is pure TypeScript and 95%+ test-covered
- The Anthropic API key is server-only, never shipped to the client
- Computed values (CPA, ROAS, CTR, profit) are never stored in Firestore — always computed on read
- Daily entries use `YYYY-MM-DD` strings as document IDs
