import type { VerdictInput, VerdictMetrics } from '../types';
import { THRESHOLDS } from '../thresholds';

/**
 * FIX_OFFER: ATC / LPV rate is below healthy AND landing page is healthy.
 *
 * Visitors loaded the page (LP rate is fine) but didn't add to cart.
 * That points at the offer itself — price, perceived value, urgency,
 * social proof, or product-market fit. The upstream-healthy guard is
 * critical: without it, a broken LP would falsely register as an offer
 * problem (no LPVs → atcRate = 0 → looks like nobody wanted to buy,
 * when in reality nobody saw the offer).
 */
export function hasOfferIssue(_input: VerdictInput, metrics: VerdictMetrics): boolean {
  if (metrics.lpvRate < THRESHOLDS.HEALTHY_LPV_RATE) return false;
  return metrics.atcRate < THRESHOLDS.HEALTHY_ATC_RATE;
}
