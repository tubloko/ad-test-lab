import { describe, it, expect } from 'vitest';
import { lpvRate } from './lpvRate';

describe('lpvRate', () => {
  it('returns lpv / clicks as a percentage', () => {
    expect(lpvRate(80, 100)).toBe(80);
  });

  it('returns 0 when clicks is 0', () => {
    expect(lpvRate(50, 0)).toBe(0);
  });

  it('returns 0 when clicks is negative', () => {
    expect(lpvRate(50, -1)).toBe(0);
  });
});
