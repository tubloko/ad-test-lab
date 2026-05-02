import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatPercent } from '@/lib/utils/formatPercent';
import {
  ctrTone,
  atcRateTone,
  icRateTone,
  TONE_TEXT_CLASS,
  type ThresholdTone,
} from '@/lib/utils/threshold-color';
import type { AdsetTotals } from '@/lib/metrics/adsetTotals';

interface AdsetSummaryStripProps {
  totals: AdsetTotals;
}

/**
 * Five-metric summary rendered next to the adset title in the accordion
 * trigger. Curated picks (Spend / CTR / ATC / ATC% / IC%) — not a mirror
 * of the table's totals row. Wraps gracefully on narrow viewports;
 * never forces horizontal scroll on the parent.
 */
export function AdsetSummaryStrip({ totals }: AdsetSummaryStripProps) {
  if (!totals.hasData) {
    return (
      <p className="min-w-0 text-caption text-text-subtle">
        No data in selected range
      </p>
    );
  }

  const ctrTracked = totals.totalImpressions > 0;
  const atcRateAvailable = totals.totalLPV > 0;
  const icRateAvailable = totals.totalLPV > 0;

  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1 text-caption text-text-muted">
      <Stat label="Spend" value={formatCurrency(totals.totalSpend)} tone="neutral" />
      <Stat
        label="CTR"
        value={ctrTracked ? formatPercent(totals.ctr) : '—'}
        tone={ctrTracked ? ctrTone(totals.ctr) : 'neutral'}
        title={ctrTracked ? undefined : 'CTR needs impressions, which we don’t track yet'}
      />
      <Stat label="ATC" value={String(totals.totalATC)} tone="neutral" />
      <Stat
        label="ATC%"
        value={atcRateAvailable ? formatPercent(totals.atcRate) : '—'}
        tone={atcRateAvailable ? atcRateTone(totals.atcRate) : 'neutral'}
      />
      <Stat
        label="IC%"
        value={icRateAvailable ? formatPercent(totals.icRate) : '—'}
        tone={icRateAvailable ? icRateTone(totals.icRate) : 'neutral'}
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
