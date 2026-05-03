import { describe, it, expect } from 'vitest';
import { computeProfitWithFees, hasAnyFees } from './profitWithFees';
import { profit } from './profit';

describe('computeProfitWithFees', () => {
  it('matches the simple profit formula when no fees are provided', () => {
    const r = computeProfitWithFees({ revenue: 500, spend: 100, cogs: 80, orders: 10 });
    expect(r.profit).toBe(profit(500, 100, 80));
    expect(r.transactionFees).toBe(0);
    expect(r.shippingTotal).toBe(0);
    expect(r.expectedRefunds).toBe(0);
    expect(r.netRevenue).toBe(500);
    expect(r.totalCosts).toBe(180);
  });

  it('matches simple profit formula when all fees are explicitly zero', () => {
    const r = computeProfitWithFees({
      revenue: 500,
      spend: 100,
      cogs: 80,
      orders: 10,
      transactionFeePercent: 0,
      transactionFeeFixed: 0,
      shippingCost: 0,
      refundRate: 0,
    });
    expect(r.profit).toBe(profit(500, 100, 80));
  });

  it('applies Shopify defaults (2.9% + $0.30) only on transactions', () => {
    const r = computeProfitWithFees({
      revenue: 500,
      spend: 100,
      cogs: 80,
      orders: 10,
      transactionFeePercent: 2.9,
      transactionFeeFixed: 0.3,
    });
    // 2.9% of 500 = 14.50, plus 10 orders × $0.30 = 3.00 → $17.50
    expect(r.transactionFees).toBeCloseTo(17.5, 5);
    // profit = (500 - 17.5) - 100 - 80 = 302.5
    expect(r.profit).toBeCloseTo(302.5, 5);
  });

  it('applies all fees together', () => {
    const r = computeProfitWithFees({
      revenue: 1000,
      spend: 200,
      cogs: 150,
      orders: 20,
      transactionFeePercent: 2.9,
      transactionFeeFixed: 0.3,
      shippingCost: 5,
      refundRate: 5,
    });
    // tx fees = 1000 × 0.029 + 20 × 0.30 = 29 + 6 = 35
    expect(r.transactionFees).toBeCloseTo(35, 5);
    // shipping = 20 × 5 = 100
    expect(r.shippingTotal).toBe(100);
    // refunds = 1000 × 0.05 = 50
    expect(r.expectedRefunds).toBe(50);
    // net rev = 1000 - 35 - 100 - 50 = 815
    expect(r.netRevenue).toBeCloseTo(815, 5);
    // profit = 815 - 200 - 150 = 465
    expect(r.profit).toBeCloseTo(465, 5);
  });

  it('charges no transaction fees when there are 0 orders', () => {
    const r = computeProfitWithFees({
      revenue: 0,
      spend: 50,
      cogs: 0,
      orders: 0,
      transactionFeePercent: 2.9,
      transactionFeeFixed: 0.3,
      shippingCost: 5,
    });
    expect(r.transactionFees).toBe(0);
    expect(r.shippingTotal).toBe(0); // 0 orders × 5
    expect(r.profit).toBe(-50);
  });

  it('handles 0 revenue gracefully (profit = -spend - cogs)', () => {
    const r = computeProfitWithFees({
      revenue: 0,
      spend: 100,
      cogs: 50,
      orders: 0,
      transactionFeePercent: 2.9,
      transactionFeeFixed: 0.3,
      refundRate: 5,
    });
    expect(r.transactionFees).toBe(0);
    expect(r.expectedRefunds).toBe(0);
    expect(r.profit).toBe(-150);
  });

  it('only refund rate set still subtracts from revenue', () => {
    const r = computeProfitWithFees({
      revenue: 1000,
      spend: 0,
      cogs: 0,
      orders: 10,
      refundRate: 10,
    });
    expect(r.expectedRefunds).toBe(100);
    expect(r.profit).toBe(900);
  });

  it('only fixed transaction fee with no percent', () => {
    const r = computeProfitWithFees({
      revenue: 100,
      spend: 0,
      cogs: 0,
      orders: 5,
      transactionFeeFixed: 0.3,
    });
    expect(r.transactionFees).toBeCloseTo(1.5, 5);
    expect(r.profit).toBeCloseTo(98.5, 5);
  });
});

describe('hasAnyFees', () => {
  it('returns false for empty/zero fee bundle', () => {
    expect(hasAnyFees({})).toBe(false);
    expect(
      hasAnyFees({
        transactionFeePercent: 0,
        transactionFeeFixed: 0,
        shippingCost: 0,
        refundRate: 0,
      }),
    ).toBe(false);
  });

  it('returns true if any fee is positive', () => {
    expect(hasAnyFees({ transactionFeePercent: 2.9 })).toBe(true);
    expect(hasAnyFees({ shippingCost: 5 })).toBe(true);
    expect(hasAnyFees({ refundRate: 1 })).toBe(true);
    expect(hasAnyFees({ transactionFeeFixed: 0.3 })).toBe(true);
  });
});
