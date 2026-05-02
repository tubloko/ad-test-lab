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
export const HEALTHY_CTR = THRESHOLDS.HEALTHY_CTR;

/**
 * Display threshold for CPC (USD). Lower is better. Calibrated for typical
 * low-AOV cold acquisition feeds: $1 is comfortable, $1.50 worrying.
 */
export const HEALTHY_CPC = 1.0;

/** Lower-is-better banding for CPC, mirrors `cpaTone`. */
export function cpcTone(cpc: number): ThresholdTone {
  if (!Number.isFinite(cpc) || cpc <= 0) return 'neutral';
  if (cpc <= HEALTHY_CPC) return 'success';
  if (cpc <= HEALTHY_CPC * 1.5) return 'warning';
  return 'danger';
}

/**
 * CTR % bands (Meta link CTR for cold acquisition):
 *   ≥ 3.0  success
 *   ≥ 1.5  warning
 *   <1.5  danger
 * Doesn't reuse rateTone's `healthy * 0.7` warning floor because the
 * warning band needs to start at half the healthy value here.
 */
export function ctrTone(ctr: number): ThresholdTone {
  if (ctr <= 0) return 'neutral';
  if (ctr >= 3) return 'success';
  if (ctr >= 1.5) return 'warning';
  return 'danger';
}
export function lpvRateTone(rate: number): ThresholdTone {
  if (rate <= 0) return 'neutral';
  return rateTone(rate, HEALTHY_LPV_RATE);
}
export function atcRateTone(rate: number): ThresholdTone {
  if (rate <= 0) return 'neutral';
  return rateTone(rate, HEALTHY_ATC_RATE);
}
/** Display IC% relative to LPV — see HEALTHY_IC_FROM_LPV. */
export function icRateTone(rate: number): ThresholdTone {
  if (rate <= 0) return 'neutral';
  return rateTone(rate, HEALTHY_IC_FROM_LPV);
}

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
