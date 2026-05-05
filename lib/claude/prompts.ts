import type { VerdictInput, VerdictResult } from '@/lib/verdict-engine';
import type { ProfitBreakdown } from '@/lib/metrics/profitWithFees';

export interface AdsetSummary {
  name: string;
  spend: number;
  ctr?: number;
  atcRate?: number;
}

export interface PromptContext {
  campaignName: string;
  productName: string;
  dateRange: { from: string | null; to: string };
  input: VerdictInput;
  ruleResult: VerdictResult;
  profitBreakdown: ProfitBreakdown;
  adsetBreakdown?: AdsetSummary[];
}

export const SYSTEM_PROMPT = `You are a Meta ads diagnostic expert for Shopify product testing.
You analyze daily ad performance data and identify the single most likely reason a product test is underperforming.

Diagnostic framework:
- CTR low → creative problem (hook, visual, angle)
- LPV/Clicks low → tracking issue, slow page load, or click fraud
- ATC/LPV low → landing page weak, offer unclear, or wrong audience
- IC/ATC low → checkout friction, shipping cost shock, or required account
- Orders/IC low → payment issue, trust gap, or pricing rejection at final step
- CPA above target with healthy funnel → market saturation or pricing problem

Rules:
- Be specific. Reference exact numbers from the data.
- Pick ONE primary issue, not three.
- If data is insufficient, say so honestly and set confidence to "low".
- 2–4 sentences for summary. No fluff.
- Use the seller's perspective: "your CTR" not "the CTR".
- When fees are itemized, reason about TRUE profit (after fees), not gross revenue.

Output format: ONLY valid JSON matching this schema. No markdown fences. No preamble. No trailing text.
{
  "summary": string,           // 2-4 sentences
  "primaryIssue": string,      // 1 sentence: the single biggest problem
  "recommendedAction": string, // 1-2 sentences: what to do next
  "confidence": "low" | "medium" | "high"
}`;

const usd = (n: number) => `$${n.toFixed(2)}`;
const pct = (n: number) => `${n.toFixed(1)}%`;

function feesHaveValue(b: ProfitBreakdown): boolean {
  return b.transactionFees > 0 || b.shippingTotal > 0 || b.expectedRefunds > 0;
}

function profitSection(input: VerdictInput, b: ProfitBreakdown): string {
  if (!feesHaveValue(b)) {
    return `- Profit: ${usd(b.profit)}`;
  }
  return [
    'PROFIT BREAKDOWN (fees applied):',
    `- Gross revenue: ${usd(b.grossRevenue)}`,
    `- Transaction fees: -${usd(b.transactionFees)}`,
    `- Shipping costs: -${usd(b.shippingTotal)}`,
    `- Expected refunds: -${usd(b.expectedRefunds)}`,
    `- Net revenue: ${usd(b.netRevenue)}`,
    `- Ad spend: -${usd(input.totalSpend)}`,
    `- COGS: -${usd(input.totalCOGS)}`,
    `- True profit: ${usd(b.profit)}`,
  ].join('\n');
}

export function buildDiagnosisPrompt(ctx: PromptContext): string {
  const { campaignName, productName, dateRange, input, ruleResult, profitBreakdown, adsetBreakdown } = ctx;
  const m = ruleResult.metrics;
  const fromLabel = dateRange.from ?? 'start';

  const adsetBlock =
    adsetBreakdown && adsetBreakdown.length > 0
      ? `\nADSETS:\n${adsetBreakdown
          .map(
            (a) =>
              `- ${a.name}: ${usd(a.spend)} spend` +
              (typeof a.ctr === 'number' ? `, ${pct(a.ctr)} CTR` : '') +
              (typeof a.atcRate === 'number' ? `, ${pct(a.atcRate)} ATC/LPV` : ''),
          )
          .join('\n')}\n`
      : '';

  return `Product: ${productName}
Campaign: ${campaignName}
Target CPA: ${usd(input.targetCPA)}
Date range: ${fromLabel} to ${dateRange.to} (${input.daysActive} days)

TOTALS:
- Spend: ${usd(input.totalSpend)}
- Revenue: ${usd(input.totalRevenue)}
- Orders: ${input.totalOrders}
- COGS: ${usd(input.totalCOGS)}

${profitSection(input, profitBreakdown)}

FUNNEL:
- Clicks: ${input.totalClicks}
- LPV: ${input.totalLPV} (${pct(m.lpvRate)} of clicks)
- ATC: ${input.totalATC} (${pct(m.atcRate)} of LPV)
- IC: ${input.totalIC} (${pct(m.icRate)} of ATC)
- Orders: ${input.totalOrders} (${pct(m.purchaseRate)} of IC)

KEY METRICS:
- CPA: ${usd(m.cpa)} (target: ${usd(input.targetCPA)})
- ROAS: ${m.roas.toFixed(2)}
${adsetBlock}
RULE ENGINE VERDICT: ${ruleResult.verdict}
RULE ENGINE REASON: ${ruleResult.reason}

Provide your diagnosis as JSON only.`;
}
