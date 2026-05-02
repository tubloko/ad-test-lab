import { describe, it, expect } from 'vitest';
import { formatPercent } from './formatPercent';

describe('formatPercent', () => {
  it('formats with default 1 decimal', () => {
    expect(formatPercent(12.345)).toBe('12.3%');
  });

  it('respects custom decimals', () => {
    expect(formatPercent(12.345, 2)).toBe('12.35%');
  });

  it('formats zero', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('rounds half', () => {
    expect(formatPercent(0.05, 1)).toBe('0.1%');
  });
});
