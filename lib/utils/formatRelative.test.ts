import { describe, expect, it } from 'vitest';
import { formatRelative } from './formatRelative';

describe('formatRelative', () => {
  const now = new Date('2026-05-06T12:00:00Z');

  it('returns "Just now" within the last minute', () => {
    expect(formatRelative(new Date(now.getTime() - 30 * 1000), now)).toBe('Just now');
  });

  it('formats minutes', () => {
    expect(formatRelative(new Date(now.getTime() - 5 * 60_000), now)).toBe('5m ago');
  });

  it('formats hours', () => {
    expect(formatRelative(new Date(now.getTime() - 3 * 3_600_000), now)).toBe('3h ago');
  });

  it('formats days', () => {
    expect(formatRelative(new Date(now.getTime() - 2 * 86_400_000), now)).toBe('2d ago');
  });

  it('formats weeks', () => {
    expect(formatRelative(new Date(now.getTime() - 10 * 86_400_000), now)).toBe('1w ago');
  });

  it('treats future dates as "Just now"', () => {
    expect(formatRelative(new Date(now.getTime() + 5_000), now)).toBe('Just now');
  });
});
