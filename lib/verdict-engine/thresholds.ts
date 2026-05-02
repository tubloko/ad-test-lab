/**
 * All thresholds in one place. Tune here — nowhere else.
 * Defaults calibrated against typical low-AOV ($30–80) Shopify products.
 */
export const THRESHOLDS = {
  /**
   * Minimum spend (as a multiple of targetCPA) before any verdict other
   * than NEED_MORE_DATA is allowed. At ~1.5× target, statistical noise
   * has settled enough that rule outcomes start to mean something.
   */
  MIN_SPEND_MULTIPLIER: 1.5,

  /**
   * Minimum days the test must have been live. Meta's algorithm needs at
   * least the learning phase to stabilize delivery, otherwise early KPIs
   * mostly reflect cold-start variance.
   */
  MIN_DAYS: 3,

  /**
   * Minimum total clicks required before any funnel-rate diagnosis is
   * trustworthy. Below this, conversion rates are too noisy to act on.
   */
  MIN_CLICKS: 100,

  /**
   * KILL fires when CPA exceeds (this × targetCPA). 2× is the
   * "no path to profitability without major changes" line — beyond this,
   * tweaking creative/LP rarely closes the gap.
   */
  KILL_CPA_MULTIPLIER: 2.0,

  /**
   * Healthy LPV / Clicks rate (%). Below this means the landing page
   * itself isn't loading or isn't matching the ad's promise.
   */
  HEALTHY_LPV_RATE: 70,

  /**
   * Healthy ATC / LPV rate (%). Below this means visitors saw the offer
   * but didn't add to cart — usually price, value, or urgency.
   */
  HEALTHY_ATC_RATE: 5.0,

  /**
   * Healthy IC / ATC rate (%). Below this means people added to cart but
   * didn't proceed to checkout — usually shipping cost surprise or cart
   * UX friction.
   */
  HEALTHY_IC_RATE: 60,

  /**
   * Healthy Orders / IC rate (%). Below this means people initiated
   * checkout but didn't complete — payment errors, form friction, or
   * unexpected fees at the final step.
   */
  HEALTHY_PURCHASE_RATE: 50,
} as const;
