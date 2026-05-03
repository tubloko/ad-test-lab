export interface ProfitInput {
  revenue: number;
  spend: number;
  cogs: number;
  orders: number;
  transactionFeePercent?: number;
  transactionFeeFixed?: number;
  shippingCost?: number;
  refundRate?: number;
}

export interface ProfitBreakdown {
  grossRevenue: number;
  transactionFees: number;
  shippingTotal: number;
  expectedRefunds: number;
  netRevenue: number;
  totalCosts: number;
  profit: number;
}

export function computeProfitWithFees(input: ProfitInput): ProfitBreakdown {
  const {
    revenue,
    spend,
    cogs,
    orders,
    transactionFeePercent = 0,
    transactionFeeFixed = 0,
    shippingCost = 0,
    refundRate = 0,
  } = input;

  const transactionFees =
    orders > 0
      ? revenue * (transactionFeePercent / 100) + orders * transactionFeeFixed
      : 0;
  const shippingTotal = orders * shippingCost;
  const expectedRefunds = revenue * (refundRate / 100);
  const netRevenue = revenue - transactionFees - shippingTotal - expectedRefunds;
  const totalCosts = spend + cogs;
  const profit = netRevenue - totalCosts;

  return {
    grossRevenue: revenue,
    transactionFees,
    shippingTotal,
    expectedRefunds,
    netRevenue,
    totalCosts,
    profit,
  };
}

export function hasAnyFees(fees: {
  transactionFeePercent?: number;
  transactionFeeFixed?: number;
  shippingCost?: number;
  refundRate?: number;
}): boolean {
  return Boolean(
    (fees.transactionFeePercent && fees.transactionFeePercent > 0) ||
      (fees.transactionFeeFixed && fees.transactionFeeFixed > 0) ||
      (fees.shippingCost && fees.shippingCost > 0) ||
      (fees.refundRate && fees.refundRate > 0),
  );
}
