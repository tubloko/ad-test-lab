import type { VerdictInput } from '../types';
import { THRESHOLDS } from '../thresholds';

/**
 * NEED_MORE_DATA: not enough signal yet to draw any conclusion.
 *
 * We require all three of: meaningful spend (≥ MIN_SPEND_MULTIPLIER × targetCPA),
 * a minimum learning window in days, and a minimum click volume.
 * Below any of these, conversion rates and CPA are dominated by noise
 * and Meta's learning phase, so any verdict would be premature.
 */
export function hasInsufficientData(input: VerdictInput): boolean {
  if (input.daysActive < THRESHOLDS.MIN_DAYS) return true;
  if (input.totalClicks < THRESHOLDS.MIN_CLICKS) return true;
  if (input.totalSpend < input.targetCPA * THRESHOLDS.MIN_SPEND_MULTIPLIER) return true;
  return false;
}
