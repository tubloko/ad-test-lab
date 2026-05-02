import { THRESHOLDS } from '@/lib/verdict-engine';

export type AdsetHealth = 'healthy' | 'warning' | 'critical' | 'no-data';

export interface AdsetHealthMetrics {
  /** CTR (clicks/impressions) % — pass 0 when impressions aren't tracked. */
  ctr: number;
  /** LPV / Clicks % */
  lpvRate: number;
  /** ATC / LPV % */
  atcRate: number;
}

/**
 * Decide a health bucket for an adset's funnel.
 *
 * Rules:
 *   - 'no-data'  when all three rates are 0 (no clicks / no funnel activity)
 *   - 'healthy'  when no metric is below its threshold
 *   - 'warning'  when exactly one metric is below threshold
 *   - 'critical' when two or more are below threshold
 *
 * Metrics with a value of 0 are treated as "data not available" rather than
 * "failing" — typical for CTR today since we don't track impressions yet.
 * Once that data starts flowing, CTR will start counting toward the band.
 */
export function adsetHealth({ ctr, lpvRate, atcRate }: AdsetHealthMetrics): AdsetHealth {
  if (ctr === 0 && lpvRate === 0 && atcRate === 0) return 'no-data';

  let failing = 0;
  if (ctr > 0 && ctr < THRESHOLDS.HEALTHY_CTR) failing++;
  if (lpvRate > 0 && lpvRate < THRESHOLDS.HEALTHY_LPV_RATE) failing++;
  if (atcRate > 0 && atcRate < THRESHOLDS.HEALTHY_ATC_RATE) failing++;

  if (failing === 0) return 'healthy';
  if (failing === 1) return 'warning';
  return 'critical';
}
