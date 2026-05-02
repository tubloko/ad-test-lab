import { describe, it, expect } from 'vitest';
import { profit } from './profit';

describe('profit', () => {
  it('subtracts spend and cogs from revenue', () => {
    expect(profit(500, 100, 150)).toBe(250);
  });

  it('can be negative', () => {
    expect(profit(50, 100, 30)).toBe(-80);
  });

  it('handles zero cogs', () => {
    expect(profit(200, 50, 0)).toBe(150);
  });

  it('handles all zeros', () => {
    expect(profit(0, 0, 0)).toBe(0);
  });
});
