import type { ProductEntry, AdsetEntry } from '@/types/entry';
import type { VerdictInput } from '@/lib/verdict-engine';

export interface DateRange {
  from: string | null;
  to: string;
}

export interface ProductAggregate {
  totalSpend: number;
  totalRevenue: number;
  totalOrders: number;
  totalCOGS: number;
  daysActive: number;
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

export function aggregateProductEntries(
  entries: ProductEntry[],
  range: DateRange,
): ProductAggregate {
  const filtered = entries.filter((e) => inRange(e.date, range));
  const dates = new Set<string>();
  let totalSpend = 0;
  let totalRevenue = 0;
  let totalOrders = 0;
  let totalCOGS = 0;
  for (const e of filtered) {
    totalSpend += e.spend;
    totalRevenue += e.revenue;
    totalOrders += e.orders;
    totalCOGS += e.cogs;
    dates.add(e.date);
  }
  return {
    totalSpend,
    totalRevenue,
    totalOrders,
    totalCOGS,
    daysActive: dates.size,
  };
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

export function mergeForVerdict(
  product: ProductAggregate,
  adsets: AdsetAggregate[],
  targetCPA: number,
): VerdictInput {
  const funnel = adsets.reduce(
    (acc, a) => ({
      totalClicks: acc.totalClicks + a.totalClicks,
      totalLPV: acc.totalLPV + a.totalLPV,
      totalATC: acc.totalATC + a.totalATC,
      totalIC: acc.totalIC + a.totalIC,
    }),
    { totalClicks: 0, totalLPV: 0, totalATC: 0, totalIC: 0 },
  );

  return {
    totalSpend: product.totalSpend,
    totalRevenue: product.totalRevenue,
    totalOrders: product.totalOrders,
    totalCOGS: product.totalCOGS,
    totalClicks: funnel.totalClicks,
    totalLPV: funnel.totalLPV,
    totalATC: funnel.totalATC,
    totalIC: funnel.totalIC,
    daysActive: product.daysActive,
    targetCPA,
  };
}
