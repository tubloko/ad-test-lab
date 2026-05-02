import { describe, it, expect } from 'vitest';
import { icRate } from './icRate';

describe('icRate', () => {
  it('returns ic / atc as a percentage', () => {
    expect(icRate(15, 30)).toBe(50);
  });

  it('returns 0 when atc is 0', () => {
    expect(icRate(5, 0)).toBe(0);
  });

  it('returns 0 when atc is negative', () => {
    expect(icRate(5, -1)).toBe(0);
  });
});
