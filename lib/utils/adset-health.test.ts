import { describe, it, expect } from 'vitest';
import { adsetHealth } from './adset-health';

describe('adsetHealth', () => {
  it('returns no-data when all three rates are 0', () => {
    expect(adsetHealth({ ctr: 0, lpvRate: 0, atcRate: 0 })).toBe('no-data');
  });

  it('returns healthy when LPV% and ATC% beat thresholds (CTR untracked)', () => {
    expect(adsetHealth({ ctr: 0, lpvRate: 80, atcRate: 6 })).toBe('healthy');
  });

  it('returns healthy when all three beat thresholds', () => {
    expect(adsetHealth({ ctr: 1.5, lpvRate: 80, atcRate: 6 })).toBe('healthy');
  });

  it('returns warning when exactly one rate is below threshold', () => {
    // LPV% below; ATC% healthy; CTR untracked → 1 failing
    expect(adsetHealth({ ctr: 0, lpvRate: 50, atcRate: 6 })).toBe('warning');
  });

  it('returns critical when two rates are below thresholds', () => {
    expect(adsetHealth({ ctr: 0, lpvRate: 50, atcRate: 2 })).toBe('critical');
  });

  it('returns critical when all three are below thresholds', () => {
    expect(adsetHealth({ ctr: 0.5, lpvRate: 30, atcRate: 1 })).toBe('critical');
  });

  it('does not penalize a metric that is 0 (treated as not tracked)', () => {
    // CTR=0 (no impressions data) shouldn't make the adset look unhealthy.
    expect(adsetHealth({ ctr: 0, lpvRate: 80, atcRate: 6 })).toBe('healthy');
  });

  it('does not flip to no-data when LPV/ATC have values but CTR is 0', () => {
    expect(adsetHealth({ ctr: 0, lpvRate: 50, atcRate: 6 })).not.toBe('no-data');
  });
});
