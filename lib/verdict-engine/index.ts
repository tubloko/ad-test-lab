import { computeMetrics } from './aggregate';
import { hasInsufficientData } from './rules/data-sufficiency';
import { shouldKill } from './rules/kill';
import { hasCheckoutIssue } from './rules/checkout';
import { hasOfferIssue } from './rules/offer';
import { hasLandingPageIssue } from './rules/landing-page';
import { hasCreativeIssue } from './rules/creative';
import { THRESHOLDS } from './thresholds';
import type { VerdictInput, VerdictMetrics, VerdictResult } from './types';

export type { VerdictInput, VerdictMetrics, VerdictResult, VerdictType } from './types';
export { THRESHOLDS } from './thresholds';
export { computeMetrics } from './aggregate';

export function getVerdict(input: VerdictInput): VerdictResult {
  const metrics = computeMetrics(input);

  if (hasInsufficientData(input)) {
    return {
      verdict: 'NEED_MORE_DATA',
      reason: needMoreDataReason(input),
      metrics,
      triggeredRule: 'data-sufficiency',
    };
  }

  if (shouldKill(input, metrics)) {
    return {
      verdict: 'KILL',
      reason: killReason(input, metrics),
      metrics,
      triggeredRule: 'kill',
    };
  }

  if (hasCheckoutIssue(input, metrics)) {
    return {
      verdict: 'CHECKOUT_ISSUE',
      reason: checkoutReason(input, metrics),
      metrics,
      triggeredRule: 'checkout',
    };
  }

  if (hasOfferIssue(input, metrics)) {
    return {
      verdict: 'FIX_OFFER',
      reason: offerReason(metrics),
      metrics,
      triggeredRule: 'offer',
    };
  }

  if (hasLandingPageIssue(input, metrics)) {
    return {
      verdict: 'FIX_LP',
      reason: landingPageReason(metrics),
      metrics,
      triggeredRule: 'landing-page',
    };
  }

  if (hasCreativeIssue(input, metrics)) {
    return {
      verdict: 'FIX_CREATIVE',
      reason: creativeReason(input, metrics),
      metrics,
      triggeredRule: 'creative',
    };
  }

  return {
    verdict: 'CONTINUE',
    reason: continueReason(input, metrics),
    metrics,
    triggeredRule: 'continue',
  };
}

function needMoreDataReason(input: VerdictInput): string {
  const minSpend = input.targetCPA * THRESHOLDS.MIN_SPEND_MULTIPLIER;
  const missing: string[] = [];
  if (input.daysActive < THRESHOLDS.MIN_DAYS) {
    missing.push(`${input.daysActive}d active (need ${THRESHOLDS.MIN_DAYS}+)`);
  }
  if (input.totalClicks < THRESHOLDS.MIN_CLICKS) {
    missing.push(`${input.totalClicks} clicks (need ${THRESHOLDS.MIN_CLICKS}+)`);
  }
  if (input.totalSpend < minSpend) {
    missing.push(`$${fmt(input.totalSpend)} spent (need $${fmt(minSpend)}+)`);
  }
  return `Not enough data to decide yet: ${missing.join(', ')}.`;
}

function killReason(input: VerdictInput, metrics: VerdictMetrics): string {
  const ratio = metrics.cpa / input.targetCPA;
  return `CPA $${fmt(metrics.cpa)} is ${ratio.toFixed(2)}× your target $${fmt(
    input.targetCPA,
  )}. After ${input.daysActive} days and $${fmt(
    input.totalSpend,
  )} spent, the gap is too wide to close with creative or page tweaks.`;
}

function checkoutReason(input: VerdictInput, metrics: VerdictMetrics): string {
  const icDrop =
    input.totalATC > 0 && metrics.icRate < THRESHOLDS.HEALTHY_IC_RATE;
  if (icDrop) {
    return `IC/ATC is ${fmt(metrics.icRate)}% — below the healthy ${
      THRESHOLDS.HEALTHY_IC_RATE
    }%. Shoppers add to cart but don't start checkout (likely shipping shock or cart UX).`;
  }
  return `Orders/IC is ${fmt(metrics.purchaseRate)}% — below the healthy ${
    THRESHOLDS.HEALTHY_PURCHASE_RATE
  }%. Shoppers reach checkout but don't complete (payment errors, form friction, or fees at the final step).`;
}

function offerReason(metrics: VerdictMetrics): string {
  return `ATC/LPV is ${fmt(metrics.atcRate)}% — below the healthy ${
    THRESHOLDS.HEALTHY_ATC_RATE
  }%. Visitors see the page but don't add to cart. The offer (price, perceived value, urgency, social proof) isn't compelling.`;
}

function landingPageReason(metrics: VerdictMetrics): string {
  return `LPV/Clicks is ${fmt(metrics.lpvRate)}% — below the healthy ${
    THRESHOLDS.HEALTHY_LPV_RATE
  }%. Clicks aren't turning into page views. Likely slow load, ad↔page mismatch, or weak hero on mobile.`;
}

function creativeReason(input: VerdictInput, metrics: VerdictMetrics): string {
  const ratio = metrics.cpa / input.targetCPA;
  return `CPA $${fmt(metrics.cpa)} is ${ratio.toFixed(
    2,
  )}× your target $${fmt(
    input.targetCPA,
  )}, but every on-site funnel rate is healthy. The bottleneck is top-of-funnel — creative or audience targeting.`;
}

function continueReason(input: VerdictInput, metrics: VerdictMetrics): string {
  return `CPA $${fmt(metrics.cpa)} is at or below target $${fmt(
    input.targetCPA,
  )} and funnel rates are healthy. Keep running.`;
}

function fmt(n: number): string {
  return n.toFixed(2);
}
