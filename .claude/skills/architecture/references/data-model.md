# Data Model Reference

Full Firestore schema for AdTestLab. This is the canonical source.

## Collection Tree

```
users/{uid}
  ├── (user document fields)
  ├── products/{productId}
  │   ├── (product document fields)
  │   ├── adsets/{adsetId}
  │   │   ├── (adset document fields)
  │   │   └── entries/{YYYY-MM-DD}
  │   │       └── (adset daily entry fields)
  │   ├── entries/{YYYY-MM-DD}
  │   │   └── (product daily entry fields)
  │   └── diagnoses/{diagnosisId}
  │       └── (cached AI diagnosis fields)
```

## User Document

Path: `users/{uid}`

| Field | Type | Notes |
|---|---|---|
| `uid` | string | Firebase auth UID, also doc ID |
| `email` | string | from Google Auth |
| `displayName` | string | from Google Auth |
| `timezone` | string | IANA TZ, e.g. `"Europe/Warsaw"` — used for "today" |
| `plan` | `'free' \| 'pro'` | `'free'` for MVP — hook for future paywall |
| `diagnosesUsedToday` | number | resets daily |
| `diagnosesResetDate` | string | `"YYYY-MM-DD"` of last reset |
| `createdAt` | Timestamp | server timestamp |

## Product Document

Path: `users/{uid}/products/{productId}`

| Field | Type | Notes |
|---|---|---|
| `id` | string | matches doc ID, denormalized |
| `name` | string | e.g. `"Storm Machine"` |
| `targetCPA` | number | USD, > 0 |
| `defaultCOGS` | number | USD per unit (optional, ≥ 0) |
| `status` | `'testing' \| 'scaled' \| 'killed' \| 'paused'` | defaults to `'testing'` |
| `notes` | string | optional, free text |
| `createdAt` | Timestamp | server |
| `updatedAt` | Timestamp | server |

## Adset Document

Path: `users/{uid}/products/{productId}/adsets/{adsetId}`

| Field | Type | Notes |
|---|---|---|
| `id` | string | matches doc ID |
| `productId` | string | denormalized for queries |
| `name` | string | full Meta-style: `"SA \| TOF \| Storm Machine \| tier1 \| 60$"` |
| `audience` | string | `"tier1"`, `"tier2"`, etc. |
| `funnelStage` | `'TOF' \| 'MOF' \| 'BOF'` | top/middle/bottom of funnel |
| `budget` | number | USD daily budget |
| `status` | `'active' \| 'paused' \| 'killed'` | |
| `createdAt` | Timestamp | server |
| `updatedAt` | Timestamp | server |

## Product Daily Entry

Path: `users/{uid}/products/{productId}/entries/{YYYY-MM-DD}`

**Document ID = the date.** This guarantees one entry per day per product.

| Field | Type | Notes |
|---|---|---|
| `date` | string | `"YYYY-MM-DD"`, matches doc ID |
| `spend` | number | total ad spend that day |
| `revenue` | number | Shopify revenue |
| `orders` | number | order count |
| `cogs` | number | COGS for that day's orders |
| `notes` | string | optional |
| `createdAt` | Timestamp | server |
| `updatedAt` | Timestamp | server |

**Computed fields (NEVER stored):** CPA, ROAS, profit. Compute on read.

## Adset Daily Entry

Path: `users/{uid}/products/{productId}/adsets/{adsetId}/entries/{YYYY-MM-DD}`

| Field | Type | Notes |
|---|---|---|
| `date` | string | matches doc ID |
| `spend` | number | spend on this adset that day |
| `clicks` | number | link clicks |
| `lpv` | number | landing page views |
| `atc` | number | add-to-carts |
| `ic` | number | initiated checkouts |
| `purchases` | number | optional, Meta-side count |
| `createdAt` | Timestamp | server |
| `updatedAt` | Timestamp | server |

**Computed fields:** CTR (needs impressions — not tracked in MVP), CPC, LPV%, ATC%, IC%, C%.

## Cached Diagnosis

Path: `users/{uid}/products/{productId}/diagnoses/{diagnosisId}`

| Field | Type | Notes |
|---|---|---|
| `id` | string | matches doc ID |
| `productId` | string | denormalized |
| `inputHash` | string | SHA-256 of input data — cache key |
| `dateRange` | `{ from: string; to: string }` | `"YYYY-MM-DD"` strings |
| `ruleVerdict` | `VerdictType` | from rule engine |
| `aiSummary` | string | Claude's summary |
| `primaryIssue` | string | Claude's primary issue |
| `recommendedAction` | string | Claude's recommendation |
| `confidence` | `'low' \| 'medium' \| 'high'` | Claude's confidence |
| `createdAt` | Timestamp | server |
| `expiresAt` | Timestamp | createdAt + 24h, used for cache lookup |

## TypeScript Types

These types live in `types/`. The Firestore documents above are the source of truth — TS types must match.

```ts
// types/user.ts
export interface User {
  uid: string;
  email: string;
  displayName: string;
  timezone: string;
  plan: 'free' | 'pro';
  diagnosesUsedToday: number;
  diagnosesResetDate: string;
  createdAt: Date;
}

// types/product.ts
export interface Product {
  id: string;
  name: string;
  targetCPA: number;
  defaultCOGS?: number;
  status: 'testing' | 'scaled' | 'killed' | 'paused';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// types/adset.ts
export interface Adset {
  id: string;
  productId: string;
  name: string;
  audience: string;
  funnelStage: 'TOF' | 'MOF' | 'BOF';
  budget: number;
  status: 'active' | 'paused' | 'killed';
  createdAt: Date;
  updatedAt: Date;
}

// types/entry.ts
export interface ProductEntry {
  date: string;
  spend: number;
  revenue: number;
  orders: number;
  cogs: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdsetEntry {
  date: string;
  spend: number;
  clicks: number;
  lpv: number;
  atc: number;
  ic: number;
  purchases?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## Indexes Needed

For MVP, none. All queries are within a single subcollection (no compound queries).

If/when you add cross-product queries (e.g., "show all my adsets"), Firestore will tell you which index to create.

## Migration Notes

For MVP, no migration tooling. If you need to change a schema:
1. Add the new field as optional
2. Backfill manually from Firebase console for your test users
3. Once stable, make it required in TypeScript

When you have real users, you'll need a proper migration script. Out of scope for MVP.
