import { describe, it, expect } from 'vitest';
import { todayInTZ } from './dateToday';

describe('todayInTZ', () => {
  it('returns YYYY-MM-DD format', () => {
    expect(todayInTZ('UTC')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns the same shape for any IANA zone', () => {
    expect(todayInTZ('America/New_York')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(todayInTZ('Asia/Tokyo')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
