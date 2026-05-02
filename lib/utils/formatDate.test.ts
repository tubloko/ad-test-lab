import { describe, it, expect } from 'vitest';
import { formatDate } from './formatDate';

describe('formatDate', () => {
  it('formats a YYYY-MM-DD string', () => {
    expect(formatDate('2026-04-29')).toBe('Apr 29, 2026');
  });

  it('formats a Date instance', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('Jan 5, 2026');
  });

  it('does not shift across UTC for early-day dates', () => {
    expect(formatDate('2026-01-01')).toBe('Jan 1, 2026');
  });
});
