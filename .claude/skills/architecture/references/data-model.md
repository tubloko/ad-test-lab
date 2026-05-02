# Data Model Reference

Full Firestore schema for AdTestLab. This is the canonical source.

## Collection Tree

```
users/{uid}
  ├── (user document fields)
  └── products/{productId}
      ├── (product document fields)            // organizational container only
      └── campaigns/{campaignId}
          ├── (campaign document fields)       // verdicts apply HERE, not at product level
          ├── entries/{YYYY-MM-DD}
          │   └── (campaign daily entry fields)
          ├── adsets/{adsetId}
          │   ├── (adset document fields)
          │   └── entries/{YYYY-MM-DD}
          │       └── (adset daily entry fields)
          └── diagnoses/{diagnosisId}
              └── (cached AI diagnosis fields)
```

A product is a container with a name and target CPA; it has no spend/revenue/verdict of its own. All daily numbers and verdicts live under the campaigns nested below it.

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

A product is purely organizational. No verdict or daily numbers attach to it.

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

## Campaign Document

Path: `users/{uid}/products/{productId}/campaigns/{campaignId}`

This is where verdicts live. Each campaign has its own daily entries, adsets, and cached diagnoses.

| Field | Type | Notes |
|---|---|---|
| `id` | string | matches doc ID |
| `productId` | string | denormalized for queries |
| `name` | string | campaign name |
| `status` | `'testing' \| 'scaled' \| 'killed' \| 'paused'` | defaults to `'testing'` |
| `notes` | string | optional |
| `createdAt` | Timestamp | server |
| `updatedAt` | Timestamp | server |

## Adset Document

Path: `users/{uid}/products/{productId}/campaigns/{campaignId}/adsets/{adsetId}`

| Field | Type | Notes |
|---|---|---|
| `id` | string | matches doc ID |
| `productId` | string | denormalized for breadcrumbs |
| `campaignId` | string | denormalized for queries |
| `name` | string | full Meta-style: `"SA \| TOF \| Storm Machine \| tier1 \| 60$"` |
| `audience` | string | `"tier1"`, `"tier2"`, etc. |
| `funnelStage` | `'TOF' \| 'MOF' \| 'BOF'` | top/middle/bottom of funnel |
| `budget` | number | USD daily budget |
| `status` | `'active' \| 'paused' \| 'killed'` | |
| `createdAt` | Timestamp | server |
| `updatedAt` | Timestamp | server |

## Campaign Daily Entry

Path: `users/{uid}/products/{productId}/campaigns/{campaignId}/entries/{YYYY-MM-DD}`

**Document ID = the date.** Guarantees one entry per day per campaign.

| Field | Type | Notes |
|---|---|---|
| `date` | string | `"YYYY-MM-DD"`, matches doc ID |
| `spend` | number | total ad spend that day (see `spendOverride`) |
| `revenue` | number | Shopify revenue |
| `orders` | number | order count |
| `cogs` | number | COGS for that day's orders |
| `spendOverride` | boolean | see below — defaults to `false` |
| `notes` | string | optional |
| `createdAt` | Timestamp | server |
| `updatedAt` | Timestamp | server |

### `spendOverride` semantics

- `false` (default) — the displayed/effective spend is the **sum of adset entry spends for the same date**. The stored `spend` field is ignored for display.
- `true` — the user manually edited the campaign-level spend; the stored `spend` value wins. Use `clearSpendOverride()` to revert to auto-fill.

`upsertCampaignEntry` flips the flag to `true` automatically when the caller passes a `spend` value (i.e. a manual edit). Background sync paths that just want to cache the auto-filled total should use a different code path to avoid setting the flag.

**Computed fields (NEVER stored):** CPA, ROAS, profit. Compute on read.

## Adset Daily Entry

Path: `users/{uid}/products/{productId}/campaigns/{campaignId}/adsets/{adsetId}/entries/{YYYY-MM-DD}`

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

Path: `users/{uid}/products/{productId}/campaigns/{campaignId}/diagnoses/{diagnosisId}`

Diagnoses are per-campaign. The cache key (`inputHash`) is scoped to the campaign's data over a date range.

| Field | Type | Notes |
|---|---|---|
| `id` | string | matches doc ID |
| `productId` | string | denormalized |
| `campaignId` | string | denormalized |
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

// types/campaign.ts
export interface Campaign {
  id: string;
  productId: string;
  name: string;
  status: 'testing' | 'scaled' | 'killed' | 'paused';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// types/adset.ts
export interface Adset {
  id: string;
  productId: string;
  campaignId: string;
  name: string;
  audience: string;
  funnelStage: 'TOF' | 'MOF' | 'BOF';
  budget: number;
  status: 'active' | 'paused' | 'killed';
  createdAt: Date;
  updatedAt: Date;
}

// types/entry.ts
export interface CampaignEntry {
  date: string;
  spend: number;
  revenue: number;
  orders: number;
  cogs: number;
  spendOverride: boolean;
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

If/when you add cross-campaign queries (e.g., "show all my adsets across all campaigns"), Firestore will tell you which index to create.

## Migration Notes

For MVP, no migration tooling. Schema changes are made by:
1. Add the new field as optional in zod
2. Backfill manually from Firebase console for the test user
3. Once stable, make it required

The campaign-layer refactor (May 2026) was a hard cutover: `scripts/wipe-test-data.ts` is the supported way to reset the test account when the data shape changes. Real-user migration tooling is out of scope for MVP.
