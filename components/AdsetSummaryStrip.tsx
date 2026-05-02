import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatPercent } from '@/lib/utils/formatPercent';
import {
  atcRateTone,
  icRateTone,
  ctrTone,
  rateTone,
  HEALTHY_CONV_FROM_LPV,
  TONE_TEXT_CLASS,
  type ThresholdTone,
} from '@/lib/utils/threshold-color';
import type { AdsetTotals } from '@/lib/metrics/adsetTotals';

interface AdsetSummaryStripProps {
  totals: AdsetTotals;
}

/**
 * Curated summary rendered next to the adset title in the accordion
 * trigger. Picks the funnel-stage counts and rates that matter at a
 * glance — not a mirror of the table's totals row. Wraps gracefully
 * on narrow viewports; never forces horizontal scroll on the parent.
 */
export function AdsetSummaryStrip({ totals }: AdsetSummaryStripProps) {
  if (!totals.hasData) {
    return (
      <p className="min-w-0 text-caption text-text-subtle">
        No data in selected range
      </p>
    );
  }

  const lpvRateAvailable = totals.totalLPV > 0;

  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1 text-caption text-text-muted">
      <Stat label="Spend" value={formatCurrency(totals.totalSpend)} tone="neutral" />
      <Stat
        label="CTR"
        value={totals.ctrTracked ? formatPercent(totals.ctr) : '—'}
        tone={totals.ctrTracked ? ctrTone(totals.ctr) : 'neutral'}
      />
      <Stat label="ATC" value={String(totals.totalATC)} tone="neutral" />
      <Stat
        label="ATC%"
        value={lpvRateAvailable ? formatPercent(totals.atcRate) : '—'}
        tone={lpvRateAvailable ? atcRateTone(totals.atcRate) : 'neutral'}
      />
      <Stat label="IC" value={String(totals.totalIC)} tone="neutral" />
      <Stat
        label="IC%"
        value={lpvRateAvailable ? formatPercent(totals.icRate) : '—'}
        tone={lpvRateAvailable ? icRateTone(totals.icRate) : 'neutral'}
      />
      <Stat label="Conv" value={String(totals.totalPurchases)} tone="neutral" />
      <Stat
        label="Conv%"
        value={lpvRateAvailable ? formatPercent(totals.purchaseRate) : '—'}
        tone={
          lpvRateAvailable
            ? rateTone(totals.purchaseRate, HEALTHY_CONV_FROM_LPV)
            : 'neutral'
        }
      />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  title,
}: {
  label: string;
  value: string;
  tone: ThresholdTone;
  title?: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-1" title={title}>
      <span>{label}</span>
      <span className={`text-mono tabular-nums ${TONE_TEXT_CLASS[tone]}`}>
        {value}
      </span>
    </span>
  );
}
