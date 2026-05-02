import { describe, it, expect } from 'vitest';
import { atcRate } from './atcRate';

describe('atcRate', () => {
  it('returns atc / lpv as a percentage', () => {
    expect(atcRate(20, 100)).toBe(20);
  });

  it('returns 0 when lpv is 0', () => {
    expect(atcRate(10, 0)).toBe(0);
  });

  it('returns 0 when lpv is negative', () => {
    expect(atcRate(10, -1)).toBe(0);
  });
});
