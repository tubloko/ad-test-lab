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

export const TONE_TEXT_CLASS: Record<ThresholdTone, string> = {
  success: 'text-success-text',
  warning: 'text-warning-text',
  danger: 'text-danger-text',
  neutral: 'text-text-muted',
};
