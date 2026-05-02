import { THRESHOLDS } from '@/lib/verdict-engine';

export type ThresholdTone = 'success' | 'warning' | 'danger' | 'neutral';

export function cpaTone(cpa: number, target: number): ThresholdTone {
  if (!Number.isFinite(cpa) || target <= 0) return 'neutral';
  if (cpa <= target) return 'success';
  if (cpa <= target * 1.5) return 'warning';
  return 'danger';
}

export function roasTone(roas: number): ThresholdTone {
  if (roas >= 2) return 'success';
  if (roas >= 1) return 'warning';
  return 'danger';
}

export function profitTone(profit: number): ThresholdTone {
  return profit >= 0 ? 'success' : 'danger';
}

export function rateTone(rate: number, healthy: number): ThresholdTone {
  if (rate >= healthy) return 'success';
  if (rate >= healthy * 0.7) return 'warning';
  return 'danger';
}

export const HEALTHY_LPV_RATE = THRESHOLDS.HEALTHY_LPV_RATE;
export const HEALTHY_ATC_RATE = THRESHOLDS.HEALTHY_ATC_RATE;
export const HEALTHY_IC_RATE = THRESHOLDS.HEALTHY_IC_RATE;

/**
 * Display-only thresholds for IC% and Conv% measured against landing-page
 * views. The verdict engine still uses chained rates (IC/ATC,
 * purchases/IC) with their own thresholds — these constants only color
 * the adset table and adset-trend chart.
 *
 * Picked from common low-AOV Shopify benchmarks:
 *  - IC / LPV: 3% is healthy, ~2% is mediocre, < 2% is a checkout drop-off
 *  - Purchases / LPV (Conv%): 2% is healthy, ~1.4% mediocre, < 1.4% poor
 * `rateTone` then bands at healthy and healthy*0.7.
 */
export const HEALTHY_IC_FROM_LPV = 3;
export const HEALTHY_CONV_FROM_LPV = 2;

export const TONE_TEXT_CLASS: Record<ThresholdTone, string> = {
  success: 'text-success-text',
  warning: 'text-warning-text',
  danger: 'text-danger-text',
  neutral: 'text-text-muted',
};
