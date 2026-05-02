import { describe, it, expect } from 'vitest';
import { shouldKill } from '../../rules/kill';
import { computeMetrics } from '../../aggregate';
import type { VerdictInput } from '../../types';

function makeInput(overrides: Partial<VerdictInput> = {}): VerdictInput {
  return {
    totalSpend: 600,
    totalRevenue: 200,
    totalOrders: 3,
    totalCOGS: 60,
    totalClicks: 300,
    totalLPV: 240,
    totalATC: 24,
    totalIC: 18,
    daysActive: 5,
    targetCPA: 60,
    ...overrides,
  };
}

describe('shouldKill', () => {
  it('fires when CPA > 2× target', () => {
    // spend 600, orders 3 → CPA 200, target 60 → 3.33×
    const input = makeInput();
    expect(shouldKill(input, computeMetrics(input))).toBe(true);
  });

  it('does NOT fire when CPA is at or below target', () => {
    const input = makeInput({ totalSpend: 200, totalOrders: 4 }); // CPA 50
    expect(shouldKill(input, computeMetrics(input))).toBe(false);
  });

  it('does NOT fire at the exact 2× boundary (CPA = 2 × target)', () => {
    // target 60, CPA exactly 120
    const input = makeInput({ totalSpend: 120, totalOrders: 1, targetCPA: 60 });
    expect(shouldKill(input, computeMetrics(input))).toBe(false);
  });

  it('does NOT fire when CPA is Infinity (0 orders) — handled downstream', () => {
    const input = makeInput({ totalOrders: 0 });
    expect(shouldKill(input, computeMetrics(input))).toBe(false);
  });
});
