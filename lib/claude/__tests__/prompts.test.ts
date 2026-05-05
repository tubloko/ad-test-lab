import { describe, it, expect } from 'vitest';
import { SYSTEM_PROMPT, buildDiagnosisPrompt } from '../prompts';
import type { VerdictInput, VerdictResult } from '@/lib/verdict-engine';
import { computeProfitWithFees } from '@/lib/metrics/profitWithFees';

const baseInput: VerdictInput = {
  totalSpend: 240,
  totalRevenue: 360,
  totalOrders: 12,
  totalCOGS: 96,
  totalClicks: 800,
  totalLPV: 600,
  totalATC: 90,
  totalIC: 60,
  daysActive: 4,
  targetCPA: 18,
};

const ruleResult: VerdictResult = {
  verdict: 'FIX_OFFER',
  reason: 'ATC/LPV is below threshold.',
  triggeredRule: 'offer',
  metrics: {
    cpa: 20,
    roas: 1.5,
    profit: 24,
    ctr: 1.2,
    lpvRate: 75,
    atcRate: 15,
    icRate: 66.66,
    purchaseRate: 20,
  },
};

const baseProfit = computeProfitWithFees({
  revenue: baseInput.totalRevenue,
  spend: baseInput.totalSpend,
  cogs: baseInput.totalCOGS,
  orders: baseInput.totalOrders,
});

describe('SYSTEM_PROMPT', () => {
  it('is a non-empty string with schema and JSON-only directive', () => {
    expect(typeof SYSTEM_PROMPT).toBe('string');
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(200);
    expect(SYSTEM_PROMPT).toMatch(/ONLY valid JSON/);
    expect(SYSTEM_PROMPT).toMatch(/"summary"/);
    expect(SYSTEM_PROMPT).toMatch(/"primaryIssue"/);
    expect(SYSTEM_PROMPT).toMatch(/"recommendedAction"/);
    expect(SYSTEM_PROMPT).toMatch(/"confidence"/);
  });

  it('teaches the message-creative-LP MISMATCH concept explicitly', () => {
    expect(SYSTEM_PROMPT).toMatch(/MISMATCH/);
  });

  it('lists ANTI-PATTERNS to avoid', () => {
    expect(SYSTEM_PROMPT).toMatch(/ANTI-PATTERNS/);
  });

  it('places the JSON schema at the end of the prompt', () => {
    // The schema block is what the model reads last and follows when
    // emitting output — keep it as the closing instruction.
    const trimmed = SYSTEM_PROMPT.trimEnd();
    const schemaIdx = trimmed.lastIndexOf('"confidence"');
    expect(schemaIdx).toBeGreaterThan(0);
    // Nothing of substance should come after the schema closes.
    const tail = trimmed.slice(schemaIdx);
    expect(tail).toMatch(/}$/);
  });
});

describe('buildDiagnosisPrompt', () => {
  it('embeds all key metric values pre-formatted', () => {
    const prompt = buildDiagnosisPrompt({
      productName: 'Glow Serum',
      campaignName: 'Test 1',
      dateRange: { from: '2026-04-30', to: '2026-05-03' },
      input: baseInput,
      ruleResult,
      profitBreakdown: baseProfit,
    });

    expect(prompt).toContain('Glow Serum');
    expect(prompt).toContain('Test 1');
    expect(prompt).toContain('Target CPA: $18.00');
    expect(prompt).toContain('Spend: $240.00');
    expect(prompt).toContain('Revenue: $360.00');
    expect(prompt).toContain('Orders: 12');
    expect(prompt).toContain('CPA: $20.00');
    expect(prompt).toContain('ROAS: 1.50');
    expect(prompt).toContain('LPV: 600 (75.0% of clicks)');
    expect(prompt).toContain('ATC: 90 (15.0% of LPV)');
    expect(prompt).toContain('FIX_OFFER');
    expect(prompt).toContain('Provide your diagnosis as JSON only.');
  });

  it('uses simple Profit line when no fees are configured', () => {
    const prompt = buildDiagnosisPrompt({
      productName: 'X',
      campaignName: 'C',
      dateRange: { from: '2026-04-30', to: '2026-05-03' },
      input: baseInput,
      ruleResult,
      profitBreakdown: baseProfit,
    });
    expect(prompt).toContain('- Profit: $24.00');
    expect(prompt).not.toContain('PROFIT BREAKDOWN');
  });

  it('includes fee breakdown when fees are non-zero', () => {
    const inputWithFees: VerdictInput = {
      ...baseInput,
      transactionFeePercent: 2.9,
      transactionFeeFixed: 0.3,
      shippingCost: 4,
      refundRate: 5,
    };
    const breakdown = computeProfitWithFees({
      revenue: inputWithFees.totalRevenue,
      spend: inputWithFees.totalSpend,
      cogs: inputWithFees.totalCOGS,
      orders: inputWithFees.totalOrders,
      transactionFeePercent: 2.9,
      transactionFeeFixed: 0.3,
      shippingCost: 4,
      refundRate: 5,
    });
    const prompt = buildDiagnosisPrompt({
      productName: 'X',
      campaignName: 'C',
      dateRange: { from: '2026-04-30', to: '2026-05-03' },
      input: inputWithFees,
      ruleResult,
      profitBreakdown: breakdown,
    });
    expect(prompt).toContain('PROFIT BREAKDOWN (fees applied):');
    expect(prompt).toContain('Gross revenue:');
    expect(prompt).toContain('Transaction fees:');
    expect(prompt).toContain('Shipping costs:');
    expect(prompt).toContain('Expected refunds:');
    expect(prompt).toContain('Net revenue:');
    expect(prompt).toContain('True profit:');
  });

  it('includes adset breakdown lines when provided', () => {
    const prompt = buildDiagnosisPrompt({
      productName: 'X',
      campaignName: 'C',
      dateRange: { from: '2026-04-30', to: '2026-05-03' },
      input: baseInput,
      ruleResult,
      profitBreakdown: baseProfit,
      adsetBreakdown: [
        { name: 'Cold US', spend: 120, ctr: 1.4, atcRate: 18 },
        { name: 'Lookalike 1%', spend: 60 },
      ],
    });
    expect(prompt).toContain('ADSETS:');
    expect(prompt).toContain('- Cold US: $120.00 spend, 1.4% CTR, 18.0% ATC/LPV');
    expect(prompt).toContain('- Lookalike 1%: $60.00 spend');
  });

  it('handles dateRange.from = null with "start" label', () => {
    const prompt = buildDiagnosisPrompt({
      productName: 'X',
      campaignName: 'C',
      dateRange: { from: null, to: '2026-05-03' },
      input: baseInput,
      ruleResult,
      profitBreakdown: baseProfit,
    });
    expect(prompt).toContain('Date range: start to 2026-05-03');
  });
});
