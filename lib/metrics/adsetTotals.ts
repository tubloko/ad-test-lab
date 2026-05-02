import type { AdsetEntry } from '@/types/entry';
import { lpvRate, atcRate, icFromLPV, convFromLPV } from '.';
import { isWithinRange } from '@/lib/utils/dateRange';

export interface AdsetTotals {
  totalSpend: number;
  totalClicks: number;
  totalLPV: number;
  totalATC: number;
  totalIC: number;
  totalPurchases: number;

  cpc: number;
  /**
   * Range CTR % — clicks-weighted average of per-day CTR. Daily CTR is
   * entered by the user (we don't track impressions). When weighted by
   * clicks, this is the closest proxy to the true overall ratio without
   * needing impression counts.
   */
  ctr: number;
  /** True when at least one entry in range has a non-zero CTR. */
  ctrTracked: boolean;
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
  let ctrWeightedSum = 0;
  let ctrSeen = false;
  for (const e of filtered) {
    totalSpend += e.spend;
    totalClicks += e.clicks;
    totalLPV += e.lpv;
    totalATC += e.atc;
    totalIC += e.ic;
    totalPurchases += e.purchases ?? 0;
    if (e.ctr !== undefined && e.ctr > 0) {
      ctrSeen = true;
      ctrWeightedSum += e.ctr * e.clicks;
    }
  }

  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const ctr = ctrSeen && totalClicks > 0 ? ctrWeightedSum / totalClicks : 0;

  const hasData =
    totalSpend > 0 ||
    totalClicks > 0 ||
    totalLPV > 0 ||
    totalATC > 0 ||
    totalIC > 0 ||
    totalPurchases > 0 ||
    ctrSeen;

  return {
    totalSpend,
    totalClicks,
    totalLPV,
    totalATC,
    totalIC,
    totalPurchases,
    cpc,
    ctr,
    ctrTracked: ctrSeen,
    lpvRate: lpvRate(totalLPV, totalClicks),
    atcRate: atcRate(totalATC, totalLPV),
    icRate: icFromLPV(totalIC, totalLPV),
    purchaseRate: convFromLPV(totalPurchases, totalLPV),
    hasData,
  };
}
