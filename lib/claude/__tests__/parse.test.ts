import { describe, it, expect } from 'vitest';
import { stripFences, parseAndValidate } from '../parse';

const validJson = JSON.stringify({
  summary:
    'Your CPA of $20 is above the $18 target despite a healthy click-through. The offer page is the bottleneck.',
  primaryIssue: 'ATC/LPV is materially below healthy.',
  recommendedAction: 'Test a stronger headline, add testimonials, and clarify shipping cost upfront.',
  confidence: 'medium',
});

describe('stripFences', () => {
  it('strips ```json fences', () => {
    expect(stripFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('strips bare ``` fences', () => {
    expect(stripFences('```\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('leaves clean JSON untouched', () => {
    expect(stripFences('{"a":1}')).toBe('{"a":1}');
  });

  it('handles surrounding whitespace', () => {
    expect(stripFences('  \n```json\n{"a":1}\n```\n')).toBe('{"a":1}');
  });
});

describe('parseAndValidate', () => {
  it('parses fenced JSON', () => {
    const out = parseAndValidate('```json\n' + validJson + '\n```');
    expect(out.confidence).toBe('medium');
    expect(out.summary.length).toBeGreaterThan(20);
  });

  it('parses raw JSON', () => {
    const out = parseAndValidate(validJson);
    expect(out.primaryIssue).toMatch(/ATC/);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseAndValidate('not json at all')).toThrow(/invalid JSON/);
  });

  it('throws on schema mismatch', () => {
    expect(() =>
      parseAndValidate(JSON.stringify({ summary: 'short', primaryIssue: 'x', recommendedAction: 'y', confidence: 'bad' })),
    ).toThrow(/failed schema/);
  });
});
