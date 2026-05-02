import type { VerdictInput, VerdictMetrics } from '../types';
import { THRESHOLDS } from '../thresholds';

/**
 * CHECKOUT_ISSUE: cart-and-beyond friction with healthy upstream funnel.
 *
 * Two distinct drops both count as a checkout problem:
 *   - ATC → IC drop (icRate below healthy): added-to-cart users don't
 *     start checkout. Usually shipping shock or cart UX.
 *   - IC → Order drop (purchaseRate below healthy): users start checkout
 *     but don't finish. Usually payment errors, form friction, or
 *     unexpected fees at the final step.
 *
 * Upstream rates (LP, offer) must be healthy first — otherwise a
 * broken LP or offer would incorrectly read as a checkout problem
 * just because there are no ICs to convert.
 */
export function hasCheckoutIssue(input: VerdictInput, metrics: VerdictMetrics): boolean {
  if (metrics.lpvRate < THRESHOLDS.HEALTHY_LPV_RATE) return false;
  if (metrics.atcRate < THRESHOLDS.HEALTHY_ATC_RATE) return false;

  const icDropUnhealthy =
    input.totalATC > 0 && metrics.icRate < THRESHOLDS.HEALTHY_IC_RATE;
  const purchaseDropUnhealthy =
    input.totalIC > 0 && metrics.purchaseRate < THRESHOLDS.HEALTHY_PURCHASE_RATE;

  return icDropUnhealthy || purchaseDropUnhealthy;
}
