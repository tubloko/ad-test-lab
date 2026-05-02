import { describe, it, expect } from 'vitest';
import { hasInsufficientData } from '../../rules/data-sufficiency';
import { THRESHOLDS } from '../../thresholds';
import type { VerdictInput } from '../../types';

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

describe('hasInsufficientData', () => {
  it('fires when daysActive is below MIN_DAYS', () => {
    expect(hasInsufficientData(makeInput({ daysActive: 2 }))).toBe(true);
  });

  it('fires when totalClicks is below MIN_CLICKS', () => {
    expect(hasInsufficientData(makeInput({ totalClicks: 50 }))).toBe(true);
  });

  it('fires when totalSpend is below MIN_SPEND_MULTIPLIER × targetCPA', () => {
    // targetCPA 60 × 1.5 = 90; 80 is below
    expect(
      hasInsufficientData(makeInput({ totalSpend: 80, targetCPA: 60 })),
    ).toBe(true);
  });

  it('does NOT fire when all three thresholds are comfortably exceeded', () => {
    expect(hasInsufficientData(makeInput())).toBe(false);
  });

  it('does NOT fire at the exact daysActive boundary (= MIN_DAYS)', () => {
    expect(
      hasInsufficientData(makeInput({ daysActive: THRESHOLDS.MIN_DAYS })),
    ).toBe(false);
  });

  it('does NOT fire at the exact totalClicks boundary (= MIN_CLICKS)', () => {
    expect(
      hasInsufficientData(makeInput({ totalClicks: THRESHOLDS.MIN_CLICKS })),
    ).toBe(false);
  });

  it('does NOT fire at the exact spend boundary (= MIN_SPEND_MULTIPLIER × target)', () => {
    expect(
      hasInsufficientData(
        makeInput({
          totalSpend: 60 * THRESHOLDS.MIN_SPEND_MULTIPLIER,
          targetCPA: 60,
        }),
      ),
    ).toBe(false);
  });
});
