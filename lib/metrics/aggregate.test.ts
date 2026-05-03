import { describe, it, expect } from 'vitest';
import {
  aggregateAdsetEntries,
  aggregateCampaignForVerdict,
} from './aggregate';
import type { CampaignEntry, AdsetEntry } from '@/types/entry';

function ce(date: string, fields: Partial<CampaignEntry> = {}): CampaignEntry {
  return {
    date,
    spend: 0,
    revenue: 0,
    orders: 0,
    cogs: 0,
    spendOverride: false,
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

const ALL_TIME = { from: null, to: '2099-12-31' } as const;

describe('aggregateAdsetEntries', () => {
  it('sums clicks, LPV, ATC, IC', () => {
    const entries = [
      ae('2026-05-01', { clicks: 100, lpv: 80, atc: 8, ic: 5 }),
      ae('2026-05-02', { clicks: 60, lpv: 50, atc: 4, ic: 3 }),
    ];
    const agg = aggregateAdsetEntries(entries, ALL_TIME);
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
    const agg = aggregateAdsetEntries(entries, {
      from: '2026-05-01',
      to: '2026-05-10',
    });
    expect(agg.totalClicks).toBe(60);
  });

  it('returns zeros for empty list', () => {
    expect(aggregateAdsetEntries([], ALL_TIME)).toEqual({
      totalClicks: 0,
      totalLPV: 0,
      totalATC: 0,
      totalIC: 0,
    });
  });
});

describe('aggregateCampaignForVerdict', () => {
  it('auto-fills spend from adsets when no override is set', () => {
    const campaign = [
      ce('2026-05-01', { revenue: 200, orders: 3, cogs: 30 }),
      ce('2026-05-02', { revenue: 150, orders: 2, cogs: 20 }),
    ];
    const adset1 = [
      ae('2026-05-01', { spend: 60, clicks: 100, lpv: 80, atc: 8, ic: 5 }),
      ae('2026-05-02', { spend: 40, clicks: 70, lpv: 55, atc: 5, ic: 3 }),
    ];
    const adset2 = [
      ae('2026-05-01', { spend: 30, clicks: 50, lpv: 40, atc: 4, ic: 2 }),
    ];

    const input = aggregateCampaignForVerdict(
      campaign,
      [adset1, adset2],
      ALL_TIME,
      60,
    );

    expect(input.totalSpend).toBe(130); // 60+30 on day1, 40 on day2
    expect(input.totalRevenue).toBe(350);
    expect(input.totalOrders).toBe(5);
    expect(input.totalCOGS).toBe(50);
    expect(input.totalClicks).toBe(220);
    expect(input.totalLPV).toBe(175);
    expect(input.totalATC).toBe(17);
    expect(input.totalIC).toBe(10);
    expect(input.daysActive).toBe(2);
    expect(input.targetCPA).toBe(60);
  });

  it('ignores stored campaign spend even when spendOverride is true', () => {
    // spendOverride is a deprecated field — adsets are the source of truth.
    const campaign = [
      ce('2026-05-01', {
        spend: 999,
        revenue: 200,
        orders: 3,
        cogs: 30,
        spendOverride: true,
      }),
    ];
    const adset = [ae('2026-05-01', { spend: 60 })];

    const input = aggregateCampaignForVerdict(campaign, [adset], ALL_TIME, 60);
    expect(input.totalSpend).toBe(60);
    expect(input.daysActive).toBe(1);
  });

  it('always pulls spend from adsets across dates', () => {
    const campaign = [
      ce('2026-05-01', { spend: 500, revenue: 100, orders: 1, cogs: 10 }),
      ce('2026-05-02', { revenue: 200, orders: 2, cogs: 20 }),
    ];
    const adset = [
      ae('2026-05-01', { spend: 80 }),
      ae('2026-05-02', { spend: 70 }),
    ];

    const input = aggregateCampaignForVerdict(campaign, [adset], ALL_TIME, 60);
    expect(input.totalSpend).toBe(150); // 80 + 70
    expect(input.totalRevenue).toBe(300);
    expect(input.totalOrders).toBe(3);
    expect(input.daysActive).toBe(2);
  });

  it('falls back to campaign-entry spend on dates with no adset data', () => {
    const campaign = [
      ce('2026-05-01', { spend: 100, revenue: 200, orders: 2, cogs: 20 }),
    ];
    const adset: AdsetEntry[] = []; // no adset data for this date
    const input = aggregateCampaignForVerdict(campaign, [adset], ALL_TIME, 60);
    expect(input.totalSpend).toBe(100);
  });

  it('counts a date that has only adset spend toward daysActive', () => {
    const campaign: CampaignEntry[] = [];
    const adset = [ae('2026-05-01', { spend: 50 })];
    const input = aggregateCampaignForVerdict(campaign, [adset], ALL_TIME, 60);
    expect(input.daysActive).toBe(1);
    expect(input.totalSpend).toBe(50);
    expect(input.totalRevenue).toBe(0);
    expect(input.totalOrders).toBe(0);
  });

  it('respects the date range', () => {
    const campaign = [
      ce('2026-04-30', { revenue: 999 }),
      ce('2026-05-05', { revenue: 100 }),
    ];
    const adset = [
      ae('2026-04-30', { spend: 50 }),
      ae('2026-05-05', { spend: 60 }),
    ];
    const input = aggregateCampaignForVerdict(
      campaign,
      [adset],
      { from: '2026-05-01', to: '2026-05-10' },
      60,
    );
    expect(input.totalRevenue).toBe(100);
    expect(input.totalSpend).toBe(60);
    expect(input.daysActive).toBe(1);
  });

  it('returns all-zeros for empty inputs', () => {
    const input = aggregateCampaignForVerdict([], [], ALL_TIME, 60);
    expect(input).toEqual({
      totalSpend: 0,
      totalRevenue: 0,
      totalOrders: 0,
      totalCOGS: 0,
      totalClicks: 0,
      totalLPV: 0,
      totalATC: 0,
      totalIC: 0,
      daysActive: 0,
      targetCPA: 60,
    });
  });

  it('leaves fee fields undefined when no fees argument is passed', () => {
    const input = aggregateCampaignForVerdict([ce('2026-05-01')], [[]], ALL_TIME, 60);
    expect(input.transactionFeePercent).toBeUndefined();
    expect(input.transactionFeeFixed).toBeUndefined();
    expect(input.shippingCost).toBeUndefined();
    expect(input.refundRate).toBeUndefined();
  });

  it('threads full fee bundle through to the VerdictInput', () => {
    const input = aggregateCampaignForVerdict(
      [ce('2026-05-01', { revenue: 100 })],
      [[]],
      ALL_TIME,
      60,
      {
        transactionFeePercent: 2.9,
        transactionFeeFixed: 0.3,
        shippingCost: 5,
        refundRate: 1,
      },
    );
    expect(input.transactionFeePercent).toBe(2.9);
    expect(input.transactionFeeFixed).toBe(0.3);
    expect(input.shippingCost).toBe(5);
    expect(input.refundRate).toBe(1);
  });

  it('threads partial fee bundle (only the provided keys are set)', () => {
    const input = aggregateCampaignForVerdict(
      [ce('2026-05-01')],
      [[]],
      ALL_TIME,
      60,
      { shippingCost: 5 },
    );
    expect(input.shippingCost).toBe(5);
    expect(input.transactionFeePercent).toBeUndefined();
    expect(input.transactionFeeFixed).toBeUndefined();
    expect(input.refundRate).toBeUndefined();
  });
});
