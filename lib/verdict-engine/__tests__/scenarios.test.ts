import { describe, it, expect } from 'vitest';
import { getVerdict } from '..';
import type { VerdictInput } from '../types';

function makeInput(overrides: Partial<VerdictInput> = {}): VerdictInput {
  return {
    totalSpend: 200,
    totalRevenue: 500,
    totalOrders: 8,
    totalCOGS: 80,
    totalClicks: 200,
    totalLPV: 160, // lpvRate 80%
    totalATC: 16, // atcRate 10%
    totalIC: 12, // icRate 75%, purchaseRate 66.7%
    daysActive: 5,
    targetCPA: 60,
    ...overrides,
  };
}

describe('Verdict Engine — real-world scenarios', () => {
  it('Day 1, only $20 spend → NEED_MORE_DATA', () => {
    const result = getVerdict({
      totalSpend: 20,
      totalRevenue: 0,
      totalOrders: 0,
      totalCOGS: 0,
      totalClicks: 30,
      totalLPV: 25,
      totalATC: 0,
      totalIC: 0,
      daysActive: 1,
      targetCPA: 60,
    });
    expect(result.verdict).toBe('NEED_MORE_DATA');
    expect(result.triggeredRule).toBe('data-sufficiency');
  });

  it('Solid CPA, decent funnel → CONTINUE', () => {
    const result = getVerdict(makeInput()); // CPA 25, all rates healthy
    expect(result.verdict).toBe('CONTINUE');
    expect(result.triggeredRule).toBe('continue');
  });

  it('CPA 3× target after 5 days → KILL', () => {
    const result = getVerdict(
      makeInput({
        totalSpend: 600,
        totalOrders: 3, // CPA 200, target 60 → 3.33×
        totalRevenue: 200,
        totalCOGS: 60,
        totalClicks: 300,
        totalLPV: 240,
        totalATC: 24,
        totalIC: 18,
      }),
    );
    expect(result.verdict).toBe('KILL');
    expect(result.triggeredRule).toBe('kill');
    expect(result.reason).toMatch(/3\.33×/);
  });

  it('CTR effectively 0.5% (low click volume → high CPC), funnel healthy → FIX_CREATIVE', () => {
    // Funnel rates all healthy, CPA above target but below 2× kill line.
    const result = getVerdict(
      makeInput({
        totalSpend: 350,
        totalOrders: 5, // CPA 70 — above 60, well below 120
        totalClicks: 150,
        totalLPV: 120, // 80%
        totalATC: 12, // 10%
        totalIC: 8, // 66.7%
      }),
    );
    expect(result.verdict).toBe('FIX_CREATIVE');
    expect(result.triggeredRule).toBe('creative');
  });

  it('CTR good, LPV/Clicks 30% → FIX_LP', () => {
    const result = getVerdict(
      makeInput({
        totalClicks: 200,
        totalLPV: 60, // lpvRate 30%
        totalATC: 5,
        totalIC: 4,
        totalOrders: 3,
      }),
    );
    expect(result.verdict).toBe('FIX_LP');
    expect(result.triggeredRule).toBe('landing-page');
  });

  it('LPV good, ATC/LPV 1% → FIX_OFFER', () => {
    const result = getVerdict(
      makeInput({
        totalClicks: 200,
        totalLPV: 160, // lpvRate 80%
        totalATC: 1, // atcRate 0.625%
        totalIC: 0,
        totalOrders: 0,
      }),
    );
    expect(result.verdict).toBe('FIX_OFFER');
    expect(result.triggeredRule).toBe('offer');
  });

  it('ATC good, IC happens, but Orders/IC < 30% → CHECKOUT_ISSUE', () => {
    const result = getVerdict(
      makeInput({
        totalLPV: 160, // 80%
        totalATC: 16, // 10%
        totalIC: 12, // 75%
        totalOrders: 3, // purchaseRate 25%
        totalSpend: 200,
      }),
    );
    expect(result.verdict).toBe('CHECKOUT_ISSUE');
    expect(result.triggeredRule).toBe('checkout');
    expect(result.reason).toMatch(/Orders\/IC/);
  });

  it('priority: data-sufficiency wins over kill (low days, terrible CPA)', () => {
    // Even with 0 orders and $300 spent, only 2 days = NEED_MORE_DATA
    const result = getVerdict(
      makeInput({
        daysActive: 2,
        totalSpend: 300,
        totalOrders: 0,
        totalRevenue: 0,
      }),
    );
    expect(result.verdict).toBe('NEED_MORE_DATA');
  });

  it('priority: kill wins over checkout issue when both apply', () => {
    // CPA way over kill line AND purchaseRate is bad — KILL takes precedence
    const result = getVerdict(
      makeInput({
        totalSpend: 600,
        totalOrders: 3, // CPA 200
        totalIC: 18,
        // purchaseRate would be 16.7%
      }),
    );
    expect(result.verdict).toBe('KILL');
  });

  it('priority: a broken LP outranks a "broken" offer (since offer guards on LP)', () => {
    // lpvRate 30%, atcRate would be 0% — should be FIX_LP, not FIX_OFFER
    const result = getVerdict(
      makeInput({
        totalLPV: 60,
        totalATC: 0,
        totalIC: 0,
        totalOrders: 0,
        totalSpend: 200,
      }),
    );
    expect(result.verdict).toBe('FIX_LP');
  });

  it('reason text references specific metric values', () => {
    const result = getVerdict(
      makeInput({
        totalSpend: 600,
        totalOrders: 3,
        totalRevenue: 200,
        totalCOGS: 60,
      }),
    );
    expect(result.reason).toContain('CPA');
    expect(result.reason).toContain('60'); // target
    expect(result.reason).toContain('200'); // CPA
  });

  it('NEED_MORE_DATA reason names every missing precondition', () => {
    const result = getVerdict({
      totalSpend: 30,
      totalRevenue: 0,
      totalOrders: 0,
      totalCOGS: 0,
      totalClicks: 50,
      totalLPV: 25,
      totalATC: 0,
      totalIC: 0,
      daysActive: 1,
      targetCPA: 60,
    });
    expect(result.reason).toMatch(/1d/);
    expect(result.reason).toMatch(/50 clicks/);
    expect(result.reason).toMatch(/\$30/);
  });

  it('CONTINUE reason confirms healthy state', () => {
    const result = getVerdict(makeInput());
    expect(result.reason).toMatch(/Keep running/);
  });

  it('NEED_MORE_DATA reason lists only the missing precondition (days only)', () => {
    // Spend and clicks are above thresholds; only daysActive is short.
    const result = getVerdict(
      makeInput({ daysActive: 2, totalSpend: 200, totalClicks: 200 }),
    );
    expect(result.verdict).toBe('NEED_MORE_DATA');
    expect(result.reason).toMatch(/2d/);
    expect(result.reason).not.toMatch(/clicks/);
    expect(result.reason).not.toMatch(/spent/);
  });

  it('CHECKOUT_ISSUE via IC drop (ATC → IC) names the IC/ATC step in the reason', () => {
    // ATC 16, IC 6 → icRate 37.5%; orders 5 → purchaseRate 83% (healthy)
    const result = getVerdict(
      makeInput({
        totalLPV: 160,
        totalATC: 16,
        totalIC: 6,
        totalOrders: 5,
      }),
    );
    expect(result.verdict).toBe('CHECKOUT_ISSUE');
    expect(result.reason).toMatch(/IC\/ATC/);
  });

  it('FIX_CREATIVE reason calls out top-of-funnel as the bottleneck', () => {
    const result = getVerdict(
      makeInput({
        totalSpend: 350,
        totalOrders: 5,
        totalClicks: 150,
        totalLPV: 120,
        totalATC: 12,
        totalIC: 8,
      }),
    );
    expect(result.reason).toMatch(/top-of-funnel/);
  });
});
