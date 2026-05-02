export type VerdictType =
  | 'NEED_MORE_DATA'
  | 'KILL'
  | 'CHECKOUT_ISSUE'
  | 'FIX_OFFER'
  | 'FIX_LP'
  | 'FIX_CREATIVE'
  | 'CONTINUE';

export interface VerdictInput {
  totalSpend: number;
  totalRevenue: number;
  totalOrders: number;
  totalCOGS: number;
  totalClicks: number;
  totalLPV: number;
  totalATC: number;
  totalIC: number;
  daysActive: number;

  targetCPA: number;
}

export interface VerdictMetrics {
  cpa: number;
  roas: number;
  profit: number;
  ctr: number;
  lpvRate: number;
  atcRate: number;
  icRate: number;
  purchaseRate: number;
}

export interface VerdictResult {
  verdict: VerdictType;
  reason: string;
  metrics: VerdictMetrics;
  triggeredRule: string;
}
