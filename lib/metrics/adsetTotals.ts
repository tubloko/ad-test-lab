import type { AdsetEntry } from '@/types/entry';
import { lpvRate, atcRate, icFromLPV, convFromLPV } from '.';
import { isWithinRange } from '@/lib/utils/dateRange';

export interface AdsetTotals {
  totalSpend: number;
  totalClicks: number;
  totalImpressions: number; // 0 until we track impressions
  totalLPV: number;
  totalATC: number;
  totalIC: number;
  totalPurchases: number;

  cpc: number;
  /** Clicks / Impressions × 100. 0 when impressions are 0 (we don't track yet). */
  ctr: number;
  /** LPV / Clicks × 100. */
  lpvRate: number;
  /** ATC / LPV × 100. */
  atcRate: number;
  /** IC / LPV × 100 (display-only — verdict engine still uses IC/ATC). */
  icRate: number;
  /** Purchases / LPV × 100 (display-only). */
  purchaseRate: number;

  /** True when at least one entry in range has any non-zero numeric value. */
  hasData: boolean;
}

export interface DateRange {
  from: string | null;
  to: string;
}

export function computeAdsetTotals(
  entries: AdsetEntry[],
  range: DateRange,
): AdsetTotals {
  const filtered = entries.filter((e) => isWithinRange(e.date, range.from, range.to));

  let totalSpend = 0;
  let totalClicks = 0;
  let totalLPV = 0;
  let totalATC = 0;
  let totalIC = 0;
  let totalPurchases = 0;
  for (const e of filtered) {
    totalSpend += e.spend;
    totalClicks += e.clicks;
    totalLPV += e.lpv;
    totalATC += e.atc;
    totalIC += e.ic;
    totalPurchases += e.purchases ?? 0;
  }

  const totalImpressions = 0; // not tracked yet

  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  const hasData =
    totalSpend > 0 ||
    totalClicks > 0 ||
    totalLPV > 0 ||
    totalATC > 0 ||
    totalIC > 0 ||
    totalPurchases > 0;

  return {
    totalSpend,
    totalClicks,
    totalImpressions,
    totalLPV,
    totalATC,
    totalIC,
    totalPurchases,
    cpc,
    ctr,
    lpvRate: lpvRate(totalLPV, totalClicks),
    atcRate: atcRate(totalATC, totalLPV),
    icRate: icFromLPV(totalIC, totalLPV),
    purchaseRate: convFromLPV(totalPurchases, totalLPV),
    hasData,
  };
}
