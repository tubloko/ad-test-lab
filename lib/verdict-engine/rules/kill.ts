import type { VerdictInput, VerdictMetrics } from '../types';
import { THRESHOLDS } from '../thresholds';

/**
 * KILL: CPA is more than KILL_CPA_MULTIPLIER × target after sufficient data.
 *
 * At this gap to target, no realistic creative/LP/offer fix closes the
 * difference — the unit economics simply don't work. Pull the plug
 * rather than spend more learning what we already know.
 *
 * 0 orders (CPA = Infinity) is intentionally NOT killed here. The funnel
 * rules below give a more actionable diagnosis (the user should know
 * WHERE the funnel broke, not just "it broke").
 */
export function shouldKill(input: VerdictInput, metrics: VerdictMetrics): boolean {
  if (metrics.cpa === Infinity) return false;
  return metrics.cpa > input.targetCPA * THRESHOLDS.KILL_CPA_MULTIPLIER;
}
