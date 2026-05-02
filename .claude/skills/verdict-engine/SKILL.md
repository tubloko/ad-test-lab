---
name: adtestlab-verdict-engine
description: How to write, test, and extend the AdTestLab verdict engine — the pure-TypeScript module that decides KILL, CONTINUE, FIX_CREATIVE, FIX_LP, FIX_OFFER, CHECKOUT_ISSUE, or NEED_MORE_DATA. Use this skill whenever working in lib/verdict-engine/, adding or tuning rules, defining thresholds, writing verdict tests, or when the user mentions verdict, diagnosis logic, decision rules, thresholds, or "the brain". Read this BEFORE adding any verdict logic.
---

# AdTestLab Verdict Engine

This is the product's brain. It must be:
1. **Pure** — no Firebase, no React, no I/O
2. **Deterministic** — same input, same output, every time
3. **Testable** — every rule covered by unit tests
4. **Tunable** — thresholds in one file, no magic numbers in rules

If you violate any of these four, the engine becomes untrustworthy and the product loses its core value.

## Folder Structure

```
lib/verdict-engine/
├── index.ts                    # public API: getVerdict(input) → result
├── types.ts                    # VerdictInput, VerdictResult, VerdictType
├── thresholds.ts               # all magic numbers in one place
├── aggregate.ts                # rolls daily entries → totals + funnel rates
├── rules/
│   ├── data-sufficiency.ts     # NEED_MORE_DATA check
│   ├── kill.ts                 # KILL check
│   ├── checkout.ts             # CHECKOUT_ISSUE check
│   ├── offer.ts                # FIX_OFFER check
│   ├── landing-page.ts         # FIX_LP check
│   ├── creative.ts             # FIX_CREATIVE check
│   └── continue.ts             # CONTINUE (fallback)
└── __tests__/
    ├── thresholds.test.ts
    ├── aggregate.test.ts
    ├── rules/
    │   └── (one test file per rule)
    └── scenarios.test.ts       # real-data integration tests
```

## Types (the contract)

```ts
// lib/verdict-engine/types.ts

export type VerdictType =
  | 'NEED_MORE_DATA'
  | 'KILL'
  | 'CHECKOUT_ISSUE'
  | 'FIX_OFFER'
  | 'FIX_LP'
  | 'FIX_CREATIVE'
  | 'CONTINUE';

export interface VerdictInput {
  // Aggregated metrics over the date range
  totalSpend: number;
  totalRevenue: number;
  totalOrders: number;
  totalCOGS: number;
  totalClicks: number;
  totalLPV: number;
  totalATC: number;
  totalIC: number;
  daysActive: number;

  // Targets
  targetCPA: number;
}

export interface VerdictResult {
  verdict: VerdictType;
  reason: string;          // human-readable explanation
  metrics: {
    cpa: number;
    roas: number;
    profit: number;
    ctr: number;           // we don't have impressions, derive from CPC if needed; otherwise omit
    lpvRate: number;       // LPV / clicks * 100
    atcRate: number;       // ATC / LPV * 100
    icRate: number;        // IC / ATC * 100
    purchaseRate: number;  // orders / IC * 100
  };
  triggeredRule: string;   // for debugging — which rule fired
}
```

`VerdictInput` is deliberately flat and primitive. It does NOT take Firestore documents. Whoever calls the engine must aggregate first.

## The Decision Flow (priority order)

Rules check in order. **First match wins.**

```ts
// lib/verdict-engine/index.ts

import { hasInsufficientData } from './rules/data-sufficiency';
import { shouldKill } from './rules/kill';
import { hasCheckoutIssue } from './rules/checkout';
import { hasOfferIssue } from './rules/offer';
import { hasLandingPageIssue } from './rules/landing-page';
import { hasCreativeIssue } from './rules/creative';
import { computeMetrics } from './aggregate';
import type { VerdictInput, VerdictResult } from './types';

export function getVerdict(input: VerdictInput): VerdictResult {
  const metrics = computeMetrics(input);

  // 1. Not enough data to decide
  if (hasInsufficientData(input)) {
    return { verdict: 'NEED_MORE_DATA', reason: '...', metrics, triggeredRule: 'data-sufficiency' };
  }

  // 2. Lost cause — kill it
  if (shouldKill(input, metrics)) {
    return { verdict: 'KILL', reason: '...', metrics, triggeredRule: 'kill' };
  }

  // 3. Funnel breakage — bottom up (fix the closest-to-money problem first)
  if (hasCheckoutIssue(input, metrics)) {
    return { verdict: 'CHECKOUT_ISSUE', reason: '...', metrics, triggeredRule: 'checkout' };
  }
  if (hasOfferIssue(input, metrics)) {
    return { verdict: 'FIX_OFFER', reason: '...', metrics, triggeredRule: 'offer' };
  }
  if (hasLandingPageIssue(input, metrics)) {
    return { verdict: 'FIX_LP', reason: '...', metrics, triggeredRule: 'landing-page' };
  }
  if (hasCreativeIssue(input, metrics)) {
    return { verdict: 'FIX_CREATIVE', reason: '...', metrics, triggeredRule: 'creative' };
  }

  // 4. Healthy — keep going
  return { verdict: 'CONTINUE', reason: '...', metrics, triggeredRule: 'continue' };
}
```

**Why this order matters:** if you check creative first, you'd "FIX_CREATIVE" a test that's actually losing money on a broken checkout. Always start with the most fundamental issue (data → viability → bottom of funnel → top of funnel).

## Thresholds (the only place magic numbers live)

```ts
// lib/verdict-engine/thresholds.ts

/**
 * All thresholds in one place. Tune here — nowhere else.
 * Default values calibrated against typical low-AOV ($30–80) Shopify products.
 * Adjust per-product later if needed.
 */
export const THRESHOLDS = {
  // Data sufficiency — below these, we say NEED_MORE_DATA
  MIN_SPEND_MULTIPLIER: 1.5,    // need spend ≥ 1.5 × targetCPA
  MIN_DAYS: 3,
  MIN_CLICKS: 100,

  // Kill threshold
  KILL_CPA_MULTIPLIER: 2.0,     // CPA > 2× target → KILL

  // Funnel health (above = healthy, below = problem)
  HEALTHY_LPV_RATE: 70,         // LPV / Clicks (%)
  HEALTHY_ATC_RATE: 5.0,        // ATC / LPV (%)
  HEALTHY_IC_RATE: 60,          // IC / ATC (%)
  HEALTHY_PURCHASE_RATE: 50,    // Orders / IC (%)
} as const;
```

Every threshold has a comment explaining its meaning. Names are SCREAMING_SNAKE_CASE. The object is `as const` for type safety.

## Rule Pattern

Every rule is a pure function: `(input, metrics) → boolean`.

```ts
// lib/verdict-engine/rules/kill.ts
import type { VerdictInput } from '../types';
import type { Metrics } from '../aggregate';
import { THRESHOLDS } from '../thresholds';

/**
 * KILL: CPA is more than 2× target after sufficient spend.
 * The test has had its chance and failed.
 */
export function shouldKill(input: VerdictInput, metrics: Metrics): boolean {
  if (metrics.cpa === Infinity) return false; // 0 orders is handled by data-sufficiency
  return metrics.cpa > input.targetCPA * THRESHOLDS.KILL_CPA_MULTIPLIER;
}
```

**Rules of rules:**
- One rule per file
- Single function, single responsibility
- Comment explains the *why* — the marketing/business reasoning, not the code
- No threshold literals — always import from `THRESHOLDS`
- Returns boolean (or boolean + reason for richer rules)

## Aggregate Module

`aggregate.ts` does the math. Pure functions only.

```ts
// lib/verdict-engine/aggregate.ts
import type { VerdictInput } from './types';

export interface Metrics {
  cpa: number;
  roas: number;
  profit: number;
  lpvRate: number;
  atcRate: number;
  icRate: number;
  purchaseRate: number;
}

export function computeMetrics(input: VerdictInput): Metrics {
  return {
    cpa: input.totalOrders === 0 ? Infinity : input.totalSpend / input.totalOrders,
    roas: input.totalSpend === 0 ? 0 : input.totalRevenue / input.totalSpend,
    profit: input.totalRevenue - input.totalSpend - input.totalCOGS,
    lpvRate: pct(input.totalLPV, input.totalClicks),
    atcRate: pct(input.totalATC, input.totalLPV),
    icRate: pct(input.totalIC, input.totalATC),
    purchaseRate: pct(input.totalOrders, input.totalIC),
  };
}

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return (numerator / denominator) * 100;
}
```

**Watch for:** division by zero. Always guard. CPA with zero orders is `Infinity`, handled by data-sufficiency rule.

## Testing the Engine

This is the most important test suite in the entire codebase. Cover thoroughly.

```ts
// lib/verdict-engine/__tests__/scenarios.test.ts
import { describe, it, expect } from 'vitest';
import { getVerdict } from '..';

describe('Verdict Engine — real-world scenarios', () => {
  it('returns NEED_MORE_DATA when only 1 day of low spend', () => {
    const result = getVerdict({
      totalSpend: 20,
      totalRevenue: 0,
      totalOrders: 0,
      totalCOGS: 0,
      totalClicks: 30,
      totalLPV: 25,
      totalATC: 0,
      totalIC: 0,
      daysActive: 1,
      targetCPA: 60,
    });
    expect(result.verdict).toBe('NEED_MORE_DATA');
  });

  it('returns KILL when CPA is 3× target after sufficient spend', () => {
    const result = getVerdict({
      totalSpend: 600,
      totalRevenue: 100,
      totalOrders: 3,           // CPA = 200, target 60 → 3.33×
      totalCOGS: 30,
      totalClicks: 500,
      totalLPV: 400,
      totalATC: 30,
      totalIC: 10,
      daysActive: 5,
      targetCPA: 60,
    });
    expect(result.verdict).toBe('KILL');
  });

  it('returns FIX_CREATIVE when CTR low but everything else healthy', () => {
    // ... etc.
  });

  it('matches Storm Machine real data verdict', () => {
    // Plug in actual numbers from your spreadsheet, expect a specific verdict
  });
});
```

**Coverage targets:**
- Each rule: at least one positive test (rule fires) and one negative (rule doesn't fire)
- Each threshold: boundary tests (at threshold, just above, just below)
- Real data: at least 5 scenarios from your actual product tests

## Adding a New Verdict Type

1. Add to `VerdictType` union in `types.ts`
2. Create `rules/your-rule.ts`
3. Add to the priority order in `index.ts` — **think hard about where it goes**
4. Add tests in `__tests__/rules/your-rule.test.ts`
5. Update the AI prompt in `lib/claude/prompts.ts` to know about the new verdict
6. Update the UI badge component to render the new type

Never add a verdict without doing all six.

## Common Mistakes

❌ **Hardcoding numbers in rules.** Always use `THRESHOLDS`.

❌ **Reading from Firestore inside the engine.** The engine is pure. The caller passes data in.

❌ **Returning multiple verdicts.** First match wins, exactly one verdict.

❌ **Tuning thresholds without running the test suite after.** Tests pin the engine's behavior — break a test, fix it intentionally.

❌ **Letting `getVerdict` know about React, fetch, console.log, dates, anything I/O.** Pure means pure.

## When to Tune Thresholds

You'll want to tune when:
- Real users say "this verdict feels wrong"
- A scenario test you wrote based on real data fails
- You learn industry benchmarks differ from defaults

Process:
1. Add a failing test with the new expected behavior
2. Adjust thresholds in `thresholds.ts`
3. Run all tests
4. If existing tests now fail, decide intentionally: were they wrong, or is the new threshold wrong?

The test suite is your net. Trust it.
