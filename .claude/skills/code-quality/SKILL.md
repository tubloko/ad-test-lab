---
name: adtestlab-code-quality
description: Code quality principles for AdTestLab — KISS, DRY, SOLID, and the strict rule that JSX/TSX files contain UI only. Use this skill whenever writing or reviewing any code in the AdTestLab project, when the user mentions clean code, refactoring, maintainability, separation of concerns, or asks why code feels messy. Read this BEFORE writing any component, hook, or business logic.
---

# AdTestLab Code Quality Standards

Five rules. They override personal preference. They override "but it's faster to just..."

## Rule 1: JSX/TSX = UI Only

**A `.tsx` file contains ONLY:**
- The component function (returns JSX)
- A small `Props` interface above it
- Imports
- One or two trivial helpers (single line, only used here, only formatting)

**A `.tsx` file NEVER contains:**
- Business logic (calculations, validations, decisions)
- Firestore queries written inline
- API calls written inline
- Data transformation functions
- Multiple unrelated concerns

### ❌ Bad
```tsx
export function ProductCard({ product }: Props) {
  // ❌ business logic in JSX file
  const cpa = product.spend / product.orders;
  const isUnprofitable = cpa > product.targetCPA * 1.5;
  const status = isUnprofitable ? 'KILL' : 'CONTINUE';

  // ❌ Firestore call in JSX file
  const handleDelete = async () => {
    await deleteDoc(doc(db, 'users', uid, 'products', product.id));
  };

  return <div>...</div>;
}
```

### ✅ Good
```tsx
import { computeCPA } from '@/lib/metrics';
import { getVerdict } from '@/lib/verdict-engine';
import { useDeleteProduct } from '@/hooks/useDeleteProduct';

interface Props {
  product: Product;
}

export function ProductCard({ product }: Props) {
  const cpa = computeCPA(product);
  const verdict = getVerdict(product);
  const deleteProduct = useDeleteProduct();

  return <div>...</div>;
}
```

The component is now a dumb renderer. Logic lives where it's testable. This is non-negotiable.

## Rule 2: KISS — Keep It Simple, Stupid

Default to the boring solution. Optimization, abstraction, and cleverness are earned, not assumed.

**Signs you're violating KISS:**
- A function takes more than 4 parameters
- A component has more than ~150 lines
- You're using `useReducer` for fewer than 4 related state values
- You're writing a generic abstraction "in case we need it later"
- You added a library to do something the platform does natively
- A new dev would need >5 minutes to understand a single function

**Fix:** delete the cleverness. Inline the abstraction. Use `useState`.

## Rule 3: DRY — But Earn It

Don't deduplicate too early. The cost of a wrong abstraction is higher than a little duplication.

**The Rule of Three:** duplicate code is fine the first two times. On the third, extract.

**Two functions that look similar but mean different things should NOT share code.** Example: `formatProductCurrency` and `formatRevenueCurrency` might both be `(n) => '$' + n.toFixed(2)` today, but if revenue ever needs different rounding, you'll regret merging them.

**Real DRY violations to fix:**
- Same metric calculation in 3+ places → move to `lib/metrics/`
- Same Firestore path constructed in multiple files → constant or helper
- Same form validation rule across forms → shared zod schema in `types/`

## Rule 4: SOLID (the practical version)

Don't quote Uncle Bob. Just follow these:

**S — Single Responsibility.** One file, one reason to change.
- A component renders. It doesn't fetch.
- A hook fetches. It doesn't calculate.
- A pure function calculates. It doesn't render or fetch.

**O — Open/Closed.** Extend by adding, not by editing.
- New verdict type? Add a rule file in `lib/verdict-engine/rules/`. Don't edit existing rules.
- New chart? New component. Don't add a `type` prop to `Chart` and branch internally.

**L — Liskov Substitution.** Doesn't come up much in React. Skip.

**I — Interface Segregation.** Components take the minimum props they need.
- `<EntryRow entry={entry} />` is better than `<EntryRow product={wholeProduct} index={i} />` if EntryRow only needs the entry.

**D — Dependency Inversion.** Depend on abstractions.
- Components depend on hooks (`useProduct`), not directly on Firestore.
- Hooks depend on helpers (`getProduct`), not on the Firestore SDK directly.
- This makes mocking and testing trivial.

## Rule 5: Pure Functions for Logic

Anything that can be a pure function should be.

A pure function:
- Takes inputs, returns output
- Has no side effects (no Firestore writes, no DOM, no `console.log` in production)
- Same input → same output, every time
- Lives in `lib/metrics/`, `lib/verdict-engine/`, or `lib/utils/`

Pure functions are:
- Easy to test (no mocks)
- Easy to reuse
- Easy to reason about
- Easy to move

Examples in this project:
```ts
// ✅ Pure
export function ctr(clicks: number, impressions: number): number {
  if (impressions === 0) return 0;
  return (clicks / impressions) * 100;
}

// ✅ Pure
export function getVerdict(input: VerdictInput): VerdictResult {
  // ... rule logic
}

// ❌ Not pure (Firestore side effect)
export async function getCPAForProduct(productId: string): Promise<number> {
  const product = await getDoc(...);
  return product.spend / product.orders;
}
// FIX: split into getProduct() (impure) and computeCPA(product) (pure)
```

## Naming Conventions

| Kind | Convention | Example |
|---|---|---|
| Component file | PascalCase | `ProductCard.tsx` |
| Hook file | camelCase, starts with `use` | `useProduct.ts` |
| Pure function file | camelCase | `verdict.ts`, `metrics.ts` |
| Type file | camelCase | `product.ts` in `types/` |
| Constant | UPPER_SNAKE_CASE | `KILL_CPA_MULTIPLIER` |
| Function | camelCase, verb | `computeCPA`, `getVerdict` |
| Boolean | `is`, `has`, `should` prefix | `isKilled`, `hasEnoughData` |
| Component | PascalCase, noun | `ProductCard`, `VerdictBadge` |

## Comments

- Code should be self-documenting. Good names beat comments.
- Comment WHY, not WHAT.
- ❌ `// increment counter` above `counter++`
- ✅ `// Meta reports IC after ATC, but sometimes the order flips for slow connections — accept either ordering`
- TODO comments must include a name or ticket: `// TODO(piotr): handle multi-currency`

## Function Size

- Pure functions: ideally <20 lines. If >40, split.
- Components: ideally <100 lines. If >150, extract sub-components.
- Hooks: ideally <50 lines.

These are guidelines, not hard limits. But if you exceed them, write a comment explaining why.

## Imports Order

```ts
// 1. External
import { useState } from 'react';
import { z } from 'zod';

// 2. Internal absolute (using @ alias)
import { Product } from '@/types/product';
import { computeCPA } from '@/lib/metrics';
import { Button } from '@/components/ui/button';

// 3. Relative (same folder only)
import { ProductCardHeader } from './ProductCardHeader';
```

Never use deep relative paths like `../../../lib/metrics`. If you need them, use `@/` alias.

## When You're Stuck

If the file is hard to write, the structure is wrong. Stop, re-read the architecture skill, find where each piece belongs, then write each piece in its right home.
