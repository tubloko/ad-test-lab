import { describe, it, expect } from 'vitest';
import { hasLandingPageIssue } from '../../rules/landing-page';
import { computeMetrics } from '../../aggregate';
import type { VerdictInput } from '../../types';

function makeInput(overrides: Partial<VerdictInput> = {}): VerdictInput {
  return {
    totalSpend: 200,
    totalRevenue: 500,
    totalOrders: 4,
    totalCOGS: 80,
    totalClicks: 200,
    totalLPV: 160, // lpvRate 80 by default — healthy
    totalATC: 16,
    totalIC: 12,
    daysActive: 5,
    targetCPA: 60,
    ...overrides,
  };
}

describe('hasLandingPageIssue', () => {
  it('fires when lpvRate is well below the healthy threshold', () => {
    // 60 / 200 = 30% → below 70%
    const input = makeInput({ totalLPV: 60, totalClicks: 200 });
    expect(hasLandingPageIssue(input, computeMetrics(input))).toBe(true);
  });

  it('does NOT fire when lpvRate is comfortably above the threshold', () => {
    const input = makeInput(); // 80%
    expect(hasLandingPageIssue(input, computeMetrics(input))).toBe(false);
  });

  it('does NOT fire at the exact threshold (lpvRate = 70%)', () => {
    const input = makeInput({ totalLPV: 70, totalClicks: 100 });
    expect(hasLandingPageIssue(input, computeMetrics(input))).toBe(false);
  });
});
