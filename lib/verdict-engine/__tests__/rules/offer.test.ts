import { describe, it, expect } from 'vitest';
import { hasOfferIssue } from '../../rules/offer';
import { computeMetrics } from '../../aggregate';
import type { VerdictInput } from '../../types';

function makeInput(overrides: Partial<VerdictInput> = {}): VerdictInput {
  return {
    totalSpend: 200,
    totalRevenue: 500,
    totalOrders: 4,
    totalCOGS: 80,
    totalClicks: 200,
    totalLPV: 160, // lpvRate 80 — healthy
    totalATC: 16, // atcRate 10 — healthy
    totalIC: 12,
    daysActive: 5,
    targetCPA: 60,
    ...overrides,
  };
}

describe('hasOfferIssue', () => {
  it('fires when LP rate is healthy but atcRate is below the threshold', () => {
    // lpvRate 80, atcRate = 1/160 ≈ 0.625% — clearly unhealthy
    const input = makeInput({ totalATC: 1 });
    expect(hasOfferIssue(input, computeMetrics(input))).toBe(true);
  });

  it('does NOT fire when atcRate is healthy', () => {
    const input = makeInput(); // 10%
    expect(hasOfferIssue(input, computeMetrics(input))).toBe(false);
  });

  it('does NOT fire when LP rate is unhealthy (upstream-broken guard)', () => {
    // lpvRate 30% (below 70), atcRate would be 0% — but offer must NOT claim it
    const input = makeInput({ totalLPV: 60, totalATC: 0 });
    expect(hasOfferIssue(input, computeMetrics(input))).toBe(false);
  });

  it('does NOT fire at the exact atcRate threshold (= 5%)', () => {
    // 5 / 100 = 5% exactly. lpvRate stays healthy.
    const input = makeInput({ totalLPV: 100, totalClicks: 110, totalATC: 5 });
    expect(hasOfferIssue(input, computeMetrics(input))).toBe(false);
  });
});
