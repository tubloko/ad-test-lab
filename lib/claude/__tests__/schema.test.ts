import { describe, it, expect } from 'vitest';
import { DiagnosisOutputSchema } from '../schema';

const valid = {
  summary:
    'Your CPA of $20 is above the $18 target despite a healthy click-through. Most likely the offer feels weak — only 15% of LP visitors add to cart.',
  primaryIssue: 'ATC rate is too low relative to LPV traffic.',
  recommendedAction: 'Sharpen the hero offer with stronger urgency, social proof, or a discount code.',
  confidence: 'medium' as const,
};

describe('DiagnosisOutputSchema', () => {
  it('accepts a valid output', () => {
    const r = DiagnosisOutputSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it('rejects missing field', () => {
    const { confidence, ...rest } = valid;
    void confidence;
    const r = DiagnosisOutputSchema.safeParse(rest);
    expect(r.success).toBe(false);
  });

  it('rejects wrong confidence enum value', () => {
    const r = DiagnosisOutputSchema.safeParse({ ...valid, confidence: 'maybe' });
    expect(r.success).toBe(false);
  });

  it('rejects too-short summary', () => {
    const r = DiagnosisOutputSchema.safeParse({ ...valid, summary: 'too short' });
    expect(r.success).toBe(false);
  });

  it('rejects too-long primaryIssue', () => {
    const r = DiagnosisOutputSchema.safeParse({ ...valid, primaryIssue: 'a'.repeat(500) });
    expect(r.success).toBe(false);
  });

  it('rejects too-long recommendedAction', () => {
    const r = DiagnosisOutputSchema.safeParse({ ...valid, recommendedAction: 'b'.repeat(500) });
    expect(r.success).toBe(false);
  });

  it('rejects too-short recommendedAction', () => {
    const r = DiagnosisOutputSchema.safeParse({ ...valid, recommendedAction: 'short' });
    expect(r.success).toBe(false);
  });
});
