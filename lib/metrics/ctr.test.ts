import { describe, it, expect } from 'vitest';
import { ctr } from './ctr';

describe('ctr', () => {
  it('returns clicks / impressions as a percentage', () => {
    expect(ctr(50, 1000)).toBe(5);
  });

  it('returns 0 when impressions is 0', () => {
    expect(ctr(10, 0)).toBe(0);
  });

  it('returns 0 when impressions is negative', () => {
    expect(ctr(10, -1)).toBe(0);
  });

  it('returns 100 when every impression clicks', () => {
    expect(ctr(100, 100)).toBe(100);
  });
});
