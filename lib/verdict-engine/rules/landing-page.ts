import type { VerdictInput, VerdictMetrics } from '../types';
import { THRESHOLDS } from '../thresholds';

/**
 * FIX_LP: Click → LandingPageView rate is below healthy.
 *
 * People clicked the ad but didn't engage with the page. Common causes:
 * slow load, ad↔page message mismatch, weak hero / above-the-fold,
 * or the page is broken on mobile. This is the very top of the on-site
 * funnel and is checked before deeper rules because if the page itself
 * isn't landing, downstream rates can't be trusted.
 *
 * `totalClicks > 0` is guaranteed past data-sufficiency (MIN_CLICKS=100),
 * so no extra denominator guard is needed.
 */
export function hasLandingPageIssue(_input: VerdictInput, metrics: VerdictMetrics): boolean {
  return metrics.lpvRate < THRESHOLDS.HEALTHY_LPV_RATE;
}
