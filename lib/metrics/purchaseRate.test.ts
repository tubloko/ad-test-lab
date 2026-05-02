import { describe, it, expect } from 'vitest';
import { purchaseRate } from './purchaseRate';

describe('purchaseRate', () => {
  it('returns purchases / ic as a percentage', () => {
    expect(purchaseRate(8, 10)).toBe(80);
  });

  it('returns 0 when ic is 0', () => {
    expect(purchaseRate(3, 0)).toBe(0);
  });

  it('returns 0 when ic is negative', () => {
    expect(purchaseRate(3, -1)).toBe(0);
  });
});
