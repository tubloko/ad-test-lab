import { describe, it, expect } from 'vitest';
import { roas } from './roas';

describe('roas', () => {
  it('divides revenue by spend', () => {
    expect(roas(300, 100)).toBe(3);
  });

  it('returns 0 when spend is 0', () => {
    expect(roas(500, 0)).toBe(0);
  });

  it('returns 0 when spend is negative', () => {
    expect(roas(500, -1)).toBe(0);
  });

  it('returns less than 1 when unprofitable', () => {
    expect(roas(50, 100)).toBe(0.5);
  });
});
