import { describe, it, expect } from 'vitest';
import {
  aggregateProductEntries,
  aggregateAdsetEntries,
  mergeForVerdict,
} from './aggregate';
import type { ProductEntry, AdsetEntry } from '@/types/entry';

function pe(date: string, fields: Partial<ProductEntry> = {}): ProductEntry {
  return {
    date,
    spend: 0,
    revenue: 0,
    orders: 0,
    cogs: 0,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...fields,
  };
}

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

describe('aggregateProductEntries', () => {
  it('sums spend, revenue, orders, COGS and counts unique days', () => {
    const entries = [
      pe('2026-05-01', { spend: 100, revenue: 200, orders: 4, cogs: 30 }),
      pe('2026-05-02', { spend: 80, revenue: 150, orders: 3, cogs: 25 }),
    ];
    const agg = aggregateProductEntries(entries, { from: null, to: '2026-12-31' });
    expect(agg).toEqual({
      totalSpend: 180,
      totalRevenue: 350,
      totalOrders: 7,
      totalCOGS: 55,
      daysActive: 2,
    });
  });

  it('filters entries before "from"', () => {
    const entries = [
      pe('2026-04-30', { spend: 100, orders: 2 }),
      pe('2026-05-02', { spend: 80, orders: 1 }),
    ];
    const agg = aggregateProductEntries(entries, { from: '2026-05-01', to: '2026-05-10' });
    expect(agg.totalSpend).toBe(80);
    expect(agg.totalOrders).toBe(1);
    expect(agg.daysActive).toBe(1);
  });

  it('filters entries after "to"', () => {
    const entries = [
      pe('2026-05-01', { spend: 100 }),
      pe('2026-05-15', { spend: 80 }),
    ];
    const agg = aggregateProductEntries(entries, { from: null, to: '2026-05-10' });
    expect(agg.totalSpend).toBe(100);
    expect(agg.daysActive).toBe(1);
  });

  it('returns zeros for empty list', () => {
    expect(
      aggregateProductEntries([], { from: null, to: '2026-12-31' }),
    ).toEqual({
      totalSpend: 0,
      totalRevenue: 0,
      totalOrders: 0,
      totalCOGS: 0,
      daysActive: 0,
    });
  });
});

describe('aggregateAdsetEntries', () => {
  it('sums clicks, LPV, ATC, IC', () => {
    const entries = [
      ae('2026-05-01', { clicks: 100, lpv: 80, atc: 8, ic: 5 }),
      ae('2026-05-02', { clicks: 60, lpv: 50, atc: 4, ic: 3 }),
    ];
    const agg = aggregateAdsetEntries(entries, { from: null, to: '2026-12-31' });
    expect(agg).toEqual({
      totalClicks: 160,
      totalLPV: 130,
      totalATC: 12,
      totalIC: 8,
    });
  });

  it('respects date range filter', () => {
    const entries = [
      ae('2026-04-30', { clicks: 100 }),
      ae('2026-05-02', { clicks: 60 }),
    ];
    const agg = aggregateAdsetEntries(entries, { from: '2026-05-01', to: '2026-05-10' });
    expect(agg.totalClicks).toBe(60);
  });

  it('returns zeros for empty list', () => {
    expect(
      aggregateAdsetEntries([], { from: null, to: '2026-12-31' }),
    ).toEqual({
      totalClicks: 0,
      totalLPV: 0,
      totalATC: 0,
      totalIC: 0,
    });
  });
});

describe('mergeForVerdict', () => {
  it('combines product and adset aggregates into a complete VerdictInput', () => {
    const product = {
      totalSpend: 500,
      totalRevenue: 800,
      totalOrders: 10,
      totalCOGS: 200,
      daysActive: 5,
    };
    const adsets = [
      { totalClicks: 200, totalLPV: 160, totalATC: 16, totalIC: 12 },
      { totalClicks: 100, totalLPV: 80, totalATC: 8, totalIC: 6 },
    ];
    const input = mergeForVerdict(product, adsets, 60);
    expect(input).toEqual({
      totalSpend: 500,
      totalRevenue: 800,
      totalOrders: 10,
      totalCOGS: 200,
      totalClicks: 300,
      totalLPV: 240,
      totalATC: 24,
      totalIC: 18,
      daysActive: 5,
      targetCPA: 60,
    });
  });

  it('handles a product with no adsets — funnel totals are 0', () => {
    const product = {
      totalSpend: 100,
      totalRevenue: 0,
      totalOrders: 0,
      totalCOGS: 0,
      daysActive: 1,
    };
    const input = mergeForVerdict(product, [], 60);
    expect(input.totalClicks).toBe(0);
    expect(input.totalLPV).toBe(0);
    expect(input.totalATC).toBe(0);
    expect(input.totalIC).toBe(0);
    expect(input.targetCPA).toBe(60);
  });
});
