import { describe, it, expect } from 'vitest';
import { hasCheckoutIssue } from '../../rules/checkout';
import { computeMetrics } from '../../aggregate';
import type { VerdictInput } from '../../types';

function makeInput(overrides: Partial<VerdictInput> = {}): VerdictInput {
  return {
    totalSpend: 200,
    totalRevenue: 500,
    totalOrders: 8,
    totalCOGS: 80,
    totalClicks: 200,
    totalLPV: 160, // lpvRate 80 — healthy
    totalATC: 16, // atcRate 10 — healthy
    totalIC: 12, // icRate 75 — healthy
    daysActive: 5,
    targetCPA: 60,
    ...overrides,
  };
}

describe('hasCheckoutIssue', () => {
  it('fires when purchaseRate (Orders/IC) is below the threshold', () => {
    // 12 ICs, 3 orders → 25% purchaseRate
    const input = makeInput({ totalOrders: 3 });
    expect(hasCheckoutIssue(input, computeMetrics(input))).toBe(true);
  });

  it('fires when icRate (IC/ATC) is below the threshold', () => {
    // 16 ATC, 6 IC → 37.5% icRate
    const input = makeInput({ totalIC: 6, totalOrders: 4 });
    expect(hasCheckoutIssue(input, computeMetrics(input))).toBe(true);
  });

  it('does NOT fire when entire funnel is healthy', () => {
    expect(hasCheckoutIssue(makeInput(), computeMetrics(makeInput()))).toBe(
      false,
    );
  });

  it('does NOT fire when LP rate is unhealthy (upstream-broken guard)', () => {
    // Even if downstream rates would look bad, LP-broken should not read as checkout
    const input = makeInput({ totalLPV: 60, totalATC: 0, totalIC: 0, totalOrders: 0 });
    expect(hasCheckoutIssue(input, computeMetrics(input))).toBe(false);
  });

  it('does NOT fire when offer rate is unhealthy (upstream-broken guard)', () => {
    const input = makeInput({ totalATC: 1, totalIC: 0, totalOrders: 0 });
    expect(hasCheckoutIssue(input, computeMetrics(input))).toBe(false);
  });

  it('does NOT fire at the exact purchaseRate threshold (= 50%)', () => {
    // ATC 10, IC 8 → icRate 80% (healthy); IC 8, Orders 4 → 50% exactly
    const input = makeInput({ totalATC: 10, totalIC: 8, totalOrders: 4 });
    expect(hasCheckoutIssue(input, computeMetrics(input))).toBe(false);
  });

  it('does NOT fire at the exact icRate threshold (= 60%)', () => {
    // ATC 10, IC 6 → 60% exactly. Keep purchaseRate healthy.
    const input = makeInput({
      totalLPV: 100,
      totalClicks: 130,
      totalATC: 10,
      totalIC: 6,
      totalOrders: 5, // 83% purchaseRate
    });
    expect(hasCheckoutIssue(input, computeMetrics(input))).toBe(false);
  });
});
