---
name: adtestlab-testing
description: Testing strategy for AdTestLab — what to test, what to skip, how to write tests with vitest. Use this skill when writing tests, designing test cases, deciding test coverage, or when the user mentions vitest, testing, coverage, unit tests, or "how do I verify this works". Read this BEFORE writing any test file.
---

# AdTestLab Testing Strategy

We don't test for coverage numbers. We test what would silently break the product.

## Test Pyramid (Practical Version)

```
                  /\
                 /  \    Manual testing (you, real users)
                /----\
               / E2E  \  ← skip for MVP
              /--------\
             / Integration\ ← rare, only API routes
            /--------------\
           /  Unit (heavy)  \
          /__________________\
```

For an MVP with one developer, **unit tests are 90% of the value**. Skip E2E. Skip component tests for trivial display components. Focus testing budget on what fails silently.

## What to Test (in order of priority)

### 1. Verdict Engine — TEST EVERYTHING

This is non-negotiable. Every rule, every threshold, every edge case.

- Each rule's positive case (rule fires when it should)
- Each rule's negative case (rule does NOT fire when it shouldn't)
- Threshold boundaries (just above, just below)
- Aggregate math (division by zero, edge cases)
- Real-world scenarios from your spreadsheets
- Priority order (data-sufficiency wins over kill, etc.)

**Target: ~50–80 tests for the engine alone.**

### 2. Pure Calculations in `lib/metrics/`

CTR, CPA, ROAS, profit. One test per function covering:
- Happy path
- Zero denominators
- Negative inputs (if possible)

### 3. Validation Schemas (zod)

If a schema is non-trivial, test it:
- Valid input passes
- Invalid input fails with the expected error
- Edge cases (empty strings, negative numbers, missing fields)

### 4. AI Output Parser

The `parseAndValidate` function in `lib/claude/diagnose.ts`:
- Valid JSON passes
- Markdown-wrapped JSON parses (Claude does this sometimes)
- Invalid JSON throws clear error
- Schema-violating JSON throws clear error

### 5. API Route — One Integration Test

Just one happy-path test for `/api/diagnose`. Don't go deeper — it's mostly orchestration.

## What NOT to Test

- shadcn/ui components (trust them)
- React hooks that just wrap `useDocumentData` (trust Firebase)
- Trivial display components ("does this text render")
- Mocked Firestore in 100 places (the mock becomes the test)

If a component is just JSX rendering props, don't test it. If it has logic — extract the logic to `lib/`, test the lib, leave the component alone.

## Vitest Setup

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',         // We test pure logic, no DOM needed
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/**/*.ts'],   // Only measure coverage on lib code
      exclude: ['lib/firebase/**', 'lib/claude/client.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

**Key choice:** `environment: 'node'`. We don't test components, so we don't need jsdom. Faster.

## Test File Conventions

- Test files live next to source: `lib/metrics/cpa.ts` ↔ `lib/metrics/cpa.test.ts`
- For verdict engine, use `__tests__/` subfolder due to volume of tests
- Test name format: `<unit> — <scenario>` ✓ or `should <behavior>` ✓ — pick one and stick with it

## Test Anatomy

```ts
import { describe, it, expect } from 'vitest';
import { computeCPA } from './cpa';

describe('computeCPA', () => {
  it('returns spend / orders', () => {
    expect(computeCPA({ spend: 100, orders: 4 })).toBe(25);
  });

  it('returns Infinity when orders is 0', () => {
    expect(computeCPA({ spend: 100, orders: 0 })).toBe(Infinity);
  });

  it('returns 0 when spend is 0', () => {
    expect(computeCPA({ spend: 0, orders: 2 })).toBe(0);
  });
});
```

**Each test is one thing.** No bundling 5 assertions for unrelated behavior under one `it`.

## Verdict Engine Test Pattern

```ts
import { describe, it, expect } from 'vitest';
import { getVerdict } from '..';
import type { VerdictInput } from '../types';

// A factory makes scenario tests readable.
function makeInput(overrides: Partial<VerdictInput> = {}): VerdictInput {
  return {
    totalSpend: 200,
    totalRevenue: 150,
    totalOrders: 3,
    totalCOGS: 30,
    totalClicks: 300,
    totalLPV: 250,
    totalATC: 30,
    totalIC: 15,
    daysActive: 5,
    targetCPA: 60,
    ...overrides,
  };
}

describe('Verdict Engine', () => {
  describe('NEED_MORE_DATA', () => {
    it('fires when daysActive < 3', () => {
      const result = getVerdict(makeInput({ daysActive: 2 }));
      expect(result.verdict).toBe('NEED_MORE_DATA');
    });

    it('fires when totalClicks < 100', () => {
      const result = getVerdict(makeInput({ totalClicks: 50 }));
      expect(result.verdict).toBe('NEED_MORE_DATA');
    });

    it('does NOT fire when above all thresholds', () => {
      const result = getVerdict(makeInput()); // defaults are above
      expect(result.verdict).not.toBe('NEED_MORE_DATA');
    });
  });

  describe('KILL', () => {
    it('fires when CPA > 2x target', () => {
      const result = getVerdict(makeInput({
        totalSpend: 500,
        totalOrders: 3,    // CPA = 166, 2x target = 120
      }));
      expect(result.verdict).toBe('KILL');
    });
  });

  // ... etc.
});
```

The factory pattern (`makeInput`) is the secret to verdict engine tests. Without it, every test is 15 lines of setup and unreadable.

## Real-Data Scenario Tests

The most valuable tests. Take actual numbers from your spreadsheets, plug in, assert what *you* would conclude.

```ts
describe('Real scenarios from spreadsheets', () => {
  it('Storm Machine first 17 days — KILL', () => {
    const result = getVerdict({
      totalSpend: 1815.14,
      totalRevenue: 2589.72,
      totalOrders: 17,
      totalCOGS: 1269.67,
      totalClicks: 800,    // approximate
      totalLPV: 600,
      totalATC: 60,
      totalIC: 30,
      daysActive: 17,
      targetCPA: 60,
    });
    // CPA = 106.77, target 60 → 1.78x. Below 2x kill threshold.
    // But profit is -545. Should be KILL or FIX_OFFER?
    // Decide based on YOUR judgment, encode that.
    expect(result.verdict).toBe('KILL');
  });
});
```

These tests double as your **calibration log**. When a real user disagrees with a verdict, add their scenario as a test, decide what's right, adjust thresholds.

## Coverage Goal

Don't chase 100%. Aim for:

- `lib/verdict-engine/`: 95%+ — this is the brain
- `lib/metrics/`: 90%+
- `lib/claude/`: 70%+ (hard to test prompts; test parsers and validators)
- `lib/firebase/`: 0% (don't unit test wrappers around the SDK)
- `components/`: 0% for MVP
- `hooks/`: 0% for MVP

## Running Tests

```bash
# Watch mode while developing
pnpm test

# Single run for CI
pnpm test --run

# Coverage report
pnpm test --coverage

# Just the verdict engine
pnpm test verdict-engine
```

## Pre-Commit Discipline

Before pushing, the verdict engine tests must pass. Optional but recommended:

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:engine": "vitest run lib/verdict-engine"
  }
}
```

## Mocking Strategy

**Default: don't mock.** If you need to mock Firestore, you're testing the wrong layer. Test the pure function that the Firestore-using code calls.

**When mocking is OK:**
- Anthropic API in the API route integration test (use a fake response)
- `Date.now()` if a test depends on time

```ts
// Mocking Anthropic for API route test
import { vi } from 'vitest';
vi.mock('@/lib/claude/client', () => ({
  anthropic: {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"summary":"...","primaryIssue":"...","recommendedAction":"...","confidence":"high"}' }],
      }),
    },
  },
  CLAUDE_MODEL: 'claude-sonnet-4-5',
  MAX_TOKENS: 1000,
}));
```

## Common Mistakes

❌ **Testing implementation details.** Test behavior. If a refactor breaks tests without changing behavior, the tests were wrong.

❌ **One giant test file.** Break by feature.

❌ **Snapshot tests for verdict reasons.** They'll churn constantly. Test the verdict TYPE, not the reason text.

❌ **Mocking everything.** Mocks become the spec. Test the real thing where you can.

❌ **Skipping tests for "small" rule changes.** Threshold tweaks are exactly when tests matter most.

## When You Find a Bug

1. Write a failing test that reproduces it
2. Fix the code
3. Test passes
4. Commit both

The test prevents regression forever. This is how the verdict engine becomes trustworthy over time.
