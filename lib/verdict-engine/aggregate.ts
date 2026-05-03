import { computeProfitWithFees } from '@/lib/metrics/profitWithFees';
import type { VerdictInput, VerdictMetrics } from './types';

export function computeMetrics(input: VerdictInput): VerdictMetrics {
  const { profit } = computeProfitWithFees({
    revenue: input.totalRevenue,
    spend: input.totalSpend,
    cogs: input.totalCOGS,
    orders: input.totalOrders,
    transactionFeePercent: input.transactionFeePercent,
    transactionFeeFixed: input.transactionFeeFixed,
    shippingCost: input.shippingCost,
    refundRate: input.refundRate,
  });

  return {
    cpa: input.totalOrders === 0 ? Infinity : input.totalSpend / input.totalOrders,
    roas: input.totalSpend === 0 ? 0 : input.totalRevenue / input.totalSpend,
    profit,
    // We don't collect impressions, so CTR can't be computed here.
    // The field is kept on the result shape for future use.
    ctr: 0,
    lpvRate: pct(input.totalLPV, input.totalClicks),
    atcRate: pct(input.totalATC, input.totalLPV),
    icRate: pct(input.totalIC, input.totalATC),
    purchaseRate: pct(input.totalOrders, input.totalIC),
  };
}

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return (numerator / denominator) * 100;
}
