import type { CampaignEntry, AdsetEntry } from '@/types/entry';
import type { VerdictInput } from '@/lib/verdict-engine';

export interface DateRange {
  from: string | null;
  to: string;
}

export interface AdsetAggregate {
  totalClicks: number;
  totalLPV: number;
  totalATC: number;
  totalIC: number;
}

function inRange(date: string, range: DateRange): boolean {
  if (date > range.to) return false;
  if (range.from && date < range.from) return false;
  return true;
}

export function aggregateAdsetEntries(
  entries: AdsetEntry[],
  range: DateRange,
): AdsetAggregate {
  const filtered = entries.filter((e) => inRange(e.date, range));
  let totalClicks = 0;
  let totalLPV = 0;
  let totalATC = 0;
  let totalIC = 0;
  for (const e of filtered) {
    totalClicks += e.clicks;
    totalLPV += e.lpv;
    totalATC += e.atc;
    totalIC += e.ic;
  }
  return { totalClicks, totalLPV, totalATC, totalIC };
}

/**
 * Roll up a campaign + its adsets into a VerdictInput.
 *
 * Spend resolution per date:
 *   - If a campaign entry exists for the date AND has spendOverride: true,
 *     use the stored campaign-entry spend.
 *   - Otherwise, sum the adset spends for that date (auto-fill).
 *
 * `daysActive` counts unique dates with ANY activity (campaign-level data
 * or any adset spend), so a day where you only entered adset numbers
 * still counts toward the minimum-days threshold.
 *
 * Revenue / orders / COGS come exclusively from campaign entries.
 * Funnel totals (clicks, LPV, ATC, IC) come from adset entries.
 */
export function aggregateCampaignForVerdict(
  campaignEntries: CampaignEntry[],
  adsetEntries: AdsetEntry[][],
  range: DateRange,
  targetCPA: number,
): VerdictInput {
  const campaignByDate = new Map<string, CampaignEntry>();
  for (const e of campaignEntries) {
    if (inRange(e.date, range)) campaignByDate.set(e.date, e);
  }

  const adsetSpendByDate = new Map<string, number>();
  let totalClicks = 0;
  let totalLPV = 0;
  let totalATC = 0;
  let totalIC = 0;

  for (const entries of adsetEntries) {
    for (const e of entries) {
      if (!inRange(e.date, range)) continue;
      adsetSpendByDate.set(e.date, (adsetSpendByDate.get(e.date) ?? 0) + e.spend);
      totalClicks += e.clicks;
      totalLPV += e.lpv;
      totalATC += e.atc;
      totalIC += e.ic;
    }
  }

  const allDates = new Set<string>([
    ...campaignByDate.keys(),
    ...adsetSpendByDate.keys(),
  ]);

  let totalSpend = 0;
  let totalRevenue = 0;
  let totalOrders = 0;
  let totalCOGS = 0;

  for (const date of allDates) {
    const ce = campaignByDate.get(date);
    if (ce?.spendOverride) {
      totalSpend += ce.spend;
    } else {
      totalSpend += adsetSpendByDate.get(date) ?? 0;
    }
    if (ce) {
      totalRevenue += ce.revenue;
      totalOrders += ce.orders;
      totalCOGS += ce.cogs;
    }
  }

  return {
    totalSpend,
    totalRevenue,
    totalOrders,
    totalCOGS,
    totalClicks,
    totalLPV,
    totalATC,
    totalIC,
    daysActive: allDates.size,
    targetCPA,
  };
}
