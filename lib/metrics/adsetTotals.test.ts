import { describe, it, expect } from 'vitest';
import { computeAdsetTotals } from './adsetTotals';
import type { AdsetEntry } from '@/types/entry';

function ae(date: string, fields: Partial<AdsetEntry> = {}): AdsetEntry {
  return {
    date,
    spend: 0,
    clicks: 0,
    lpv: 0,
    atc: 0,
    ic: 0,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...fields,
  };
}

const ALL_TIME = { from: null, to: '2099-12-31' };

describe('computeAdsetTotals', () => {
  it('returns zeros + hasData=false for empty input', () => {
    const t = computeAdsetTotals([], ALL_TIME);
    expect(t.totalSpend).toBe(0);
    expect(t.totalClicks).toBe(0);
    expect(t.cpc).toBe(0);
    expect(t.lpvRate).toBe(0);
    expect(t.hasData).toBe(false);
  });

  it('sums raw fields across entries in range', () => {
    const t = computeAdsetTotals(
      [
        ae('2026-05-01', { spend: 50, clicks: 100, lpv: 70, atc: 7, ic: 4, purchases: 2 }),
        ae('2026-05-02', { spend: 30, clicks: 60, lpv: 40, atc: 3, ic: 2, purchases: 1 }),
      ],
      ALL_TIME,
    );
    expect(t.totalSpend).toBe(80);
    expect(t.totalClicks).toBe(160);
    expect(t.totalLPV).toBe(110);
    expect(t.totalATC).toBe(10);
    expect(t.totalIC).toBe(6);
    expect(t.totalPurchases).toBe(3);
    expect(t.cpc).toBeCloseTo(80 / 160, 5);
    expect(t.lpvRate).toBeCloseTo((110 / 160) * 100, 5);
    expect(t.atcRate).toBeCloseTo((10 / 110) * 100, 5);
    expect(t.icRate).toBeCloseTo((6 / 110) * 100, 5);
    expect(t.purchaseRate).toBeCloseTo((3 / 110) * 100, 5);
    expect(t.hasData).toBe(true);
  });

  it('respects date range', () => {
    const t = computeAdsetTotals(
      [
        ae('2026-04-30', { spend: 999, clicks: 999 }),
        ae('2026-05-02', { spend: 30, clicks: 60 }),
      ],
      { from: '2026-05-01', to: '2026-05-10' },
    );
    expect(t.totalSpend).toBe(30);
    expect(t.totalClicks).toBe(60);
  });

  it('returns 0 for division-by-zero rates', () => {
    const t = computeAdsetTotals([ae('2026-05-01', { spend: 10 })], ALL_TIME);
    expect(t.cpc).toBe(0);
    expect(t.lpvRate).toBe(0);
    expect(t.atcRate).toBe(0);
  });

  it('hasData is true when any field has a value', () => {
    const t = computeAdsetTotals([ae('2026-05-01', { spend: 5 })], ALL_TIME);
    expect(t.hasData).toBe(true);
  });

  it('CTR is the clicks-weighted average of per-day CTR', () => {
    const t = computeAdsetTotals(
      [
        ae('2026-05-01', { clicks: 100, ctr: 1.0 }),
        ae('2026-05-02', { clicks: 300, ctr: 2.0 }),
      ],
      ALL_TIME,
    );
    // weighted = (1.0*100 + 2.0*300) / 400 = 700/400 = 1.75
    expect(t.ctr).toBeCloseTo(1.75, 5);
    expect(t.ctrTracked).toBe(true);
  });

  it('CTR is 0 and ctrTracked false when no entry has CTR', () => {
    const t = computeAdsetTotals(
      [ae('2026-05-01', { clicks: 100 })],
      ALL_TIME,
    );
    expect(t.ctr).toBe(0);
    expect(t.ctrTracked).toBe(false);
  });
});
