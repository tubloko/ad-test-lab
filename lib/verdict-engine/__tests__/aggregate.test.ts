import { describe, it, expect } from 'vitest';
import { computeMetrics } from '../aggregate';
import type { VerdictInput } from '../types';

function makeInput(overrides: Partial<VerdictInput> = {}): VerdictInput {
  return {
    totalSpend: 200,
    totalRevenue: 500,
    totalOrders: 4,
    totalCOGS: 80,
    totalClicks: 200,
    totalLPV: 160,
    totalATC: 16,
    totalIC: 12,
    daysActive: 5,
    targetCPA: 60,
    ...overrides,
  };
}

describe('computeMetrics', () => {
  it('computes CPA as spend / orders', () => {
    const m = computeMetrics(makeInput({ totalSpend: 200, totalOrders: 4 }));
    expect(m.cpa).toBe(50);
  });

  it('returns Infinity for CPA when totalOrders is 0', () => {
    const m = computeMetrics(makeInput({ totalOrders: 0 }));
    expect(m.cpa).toBe(Infinity);
  });

  it('computes ROAS as revenue / spend', () => {
    const m = computeMetrics(makeInput({ totalRevenue: 500, totalSpend: 200 }));
    expect(m.roas).toBe(2.5);
  });

  it('returns 0 ROAS when totalSpend is 0 (avoid divide-by-zero)', () => {
    const m = computeMetrics(makeInput({ totalSpend: 0, totalRevenue: 100 }));
    expect(m.roas).toBe(0);
  });

  it('computes profit as revenue - spend - COGS', () => {
    const m = computeMetrics(
      makeInput({ totalRevenue: 500, totalSpend: 200, totalCOGS: 80 }),
    );
    expect(m.profit).toBe(220);
  });

  it('returns negative profit when spend + COGS exceeds revenue', () => {
    const m = computeMetrics(
      makeInput({ totalRevenue: 100, totalSpend: 200, totalCOGS: 50 }),
    );
    expect(m.profit).toBe(-150);
  });

  it('computes lpvRate as (LPV / Clicks) * 100', () => {
    const m = computeMetrics(makeInput({ totalLPV: 80, totalClicks: 100 }));
    expect(m.lpvRate).toBe(80);
  });

  it('returns 0 lpvRate when totalClicks is 0', () => {
    const m = computeMetrics(makeInput({ totalClicks: 0, totalLPV: 0 }));
    expect(m.lpvRate).toBe(0);
  });

  it('computes atcRate as (ATC / LPV) * 100', () => {
    const m = computeMetrics(makeInput({ totalATC: 8, totalLPV: 80 }));
    expect(m.atcRate).toBe(10);
  });

  it('returns 0 atcRate when totalLPV is 0', () => {
    const m = computeMetrics(makeInput({ totalLPV: 0, totalATC: 0 }));
    expect(m.atcRate).toBe(0);
  });

  it('computes icRate as (IC / ATC) * 100', () => {
    const m = computeMetrics(makeInput({ totalIC: 6, totalATC: 8 }));
    expect(m.icRate).toBe(75);
  });

  it('returns 0 icRate when totalATC is 0', () => {
    const m = computeMetrics(makeInput({ totalATC: 0, totalIC: 0 }));
    expect(m.icRate).toBe(0);
  });

  it('computes purchaseRate as (Orders / IC) * 100', () => {
    const m = computeMetrics(makeInput({ totalOrders: 3, totalIC: 6 }));
    expect(m.purchaseRate).toBe(50);
  });

  it('returns 0 purchaseRate when totalIC is 0', () => {
    const m = computeMetrics(makeInput({ totalIC: 0, totalOrders: 0 }));
    expect(m.purchaseRate).toBe(0);
  });

  it('returns ctr 0 (impressions are not collected in MVP)', () => {
    const m = computeMetrics(makeInput());
    expect(m.ctr).toBe(0);
  });

  it('computes all metrics from a single realistic input', () => {
    const m = computeMetrics({
      totalSpend: 1000,
      totalRevenue: 1500,
      totalOrders: 20,
      totalCOGS: 400,
      totalClicks: 1000,
      totalLPV: 800,
      totalATC: 80,
      totalIC: 50,
      daysActive: 7,
      targetCPA: 60,
    });
    expect(m.cpa).toBe(50);
    expect(m.roas).toBe(1.5);
    expect(m.profit).toBe(100);
    expect(m.lpvRate).toBe(80);
    expect(m.atcRate).toBe(10);
    expect(m.icRate).toBe(62.5);
    expect(m.purchaseRate).toBe(40);
  });
});
