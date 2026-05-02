import { describe, it, expect } from 'vitest';
import { cpa } from './cpa';

describe('cpa', () => {
  it('divides spend by orders', () => {
    expect(cpa(100, 4)).toBe(25);
  });

  it('returns 0 when orders is 0', () => {
    expect(cpa(100, 0)).toBe(0);
  });

  it('returns 0 when orders is negative', () => {
    expect(cpa(100, -1)).toBe(0);
  });

  it('handles zero spend', () => {
    expect(cpa(0, 5)).toBe(0);
  });

  it('handles fractional results', () => {
    expect(cpa(10, 3)).toBeCloseTo(3.333, 3);
  });
});
