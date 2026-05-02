import type { VerdictInput, VerdictMetrics } from '../types';

/**
 * FIX_CREATIVE: funnel rates all healthy, CPA still above target.
 *
 * Reaching this rule means data is sufficient, CPA hasn't crossed the
 * kill line, and every on-site stage (LP, offer, checkout) is
 * converting fine. The bottleneck must therefore be top-of-funnel:
 * the creative isn't pulling enough qualified clicks per dollar
 * (low CTR / high CPC), or the audience targeting is off. We don't
 * have impressions to compute CTR directly, so we infer this from
 * "everything downstream is healthy yet CPA is above target."
 *
 * Note: 0 orders past data-sufficiency cannot reach this rule because
 * a funnel rule above will always fire (purchaseRate=0 with healthy
 * upstream → checkout; or atcRate=0 with healthy LP → offer; etc.).
 */
export function hasCreativeIssue(input: VerdictInput, metrics: VerdictMetrics): boolean {
  if (metrics.cpa === Infinity) return false;
  return metrics.cpa > input.targetCPA;
}
