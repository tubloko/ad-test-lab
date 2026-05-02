import { describe, it, expect } from 'vitest';
import { hasCreativeIssue } from '../../rules/creative';
import { computeMetrics } from '../../aggregate';
import type { VerdictInput } from '../../types';

function makeInput(overrides: Partial<VerdictInput> = {}): VerdictInput {
  return {
    totalSpend: 350,
    totalRevenue: 250,
    totalOrders: 5,
    totalCOGS: 100,
    totalClicks: 150,
    totalLPV: 120,
    totalATC: 12,
    totalIC: 8,
    daysActive: 5,
    targetCPA: 60,
    ...overrides,
  };
}

describe('hasCreativeIssue', () => {
  it('fires when CPA is above target (and not Infinity)', () => {
    // spend 350, orders 5 → CPA 70, target 60
    const input = makeInput();
    expect(hasCreativeIssue(input, computeMetrics(input))).toBe(true);
  });

  it('does NOT fire when CPA is at or below target', () => {
    // spend 200, orders 4 → CPA 50, target 60
    const input = makeInput({ totalSpend: 200, totalOrders: 4 });
    expect(hasCreativeIssue(input, computeMetrics(input))).toBe(false);
  });

  it('does NOT fire when CPA is Infinity (0 orders) — funnel rules handle it', () => {
    const input = makeInput({ totalOrders: 0 });
    expect(hasCreativeIssue(input, computeMetrics(input))).toBe(false);
  });

  it('does NOT fire at the exact CPA = target boundary', () => {
    // spend 60, orders 1 → CPA 60 exactly
    const input = makeInput({ totalSpend: 60, totalOrders: 1, targetCPA: 60 });
    expect(hasCreativeIssue(input, computeMetrics(input))).toBe(false);
  });
});
