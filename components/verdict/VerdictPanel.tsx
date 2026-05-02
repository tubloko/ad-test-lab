'use client';

import type { VerdictResult } from '@/lib/verdict-engine';
import type { ProductAggregate } from '@/lib/metrics/aggregate';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import {
  cpaTone,
  roasTone,
  profitTone,
  TONE_TEXT_CLASS,
} from '@/lib/utils/threshold-color';
import { Card } from '@/components/ui/card';
import { VerdictBadge } from './VerdictBadge';
import { DateRangeSelect } from '@/components/DateRangeSelect';
import type { DateRangePreset } from '@/lib/utils/dateRange';

interface VerdictPanelProps {
  result: VerdictResult;
  product: ProductAggregate;
  targetCPA: number;
  preset: DateRangePreset;
  onPresetChange: (preset: DateRangePreset) => void;
}

export function VerdictPanel({
  result,
  product,
  targetCPA,
  preset,
  onPresetChange,
}: VerdictPanelProps) {
  const { metrics, reason } = result;
  const cpaDisplay = Number.isFinite(metrics.cpa) ? formatCurrency(metrics.cpa) : '—';

  return (
    <Card className="gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <VerdictBadge verdict={result.verdict} size="lg" />
        <DateRangeSelect preset={preset} onPresetChange={onPresetChange} />
      </div>

      <p className="max-w-prose text-body text-text-muted">{reason}</p>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Spend" value={formatCurrency(product.totalSpend)} />
        <Stat label="Revenue" value={formatCurrency(product.totalRevenue)} />
        <Stat
          label="Profit"
          value={formatCurrency(metrics.profit)}
          toneClass={TONE_TEXT_CLASS[profitTone(metrics.profit)]}
        />
        <Stat
          label="CPA"
          value={cpaDisplay}
          toneClass={TONE_TEXT_CLASS[cpaTone(metrics.cpa, targetCPA)]}
        />
        <Stat
          label="ROAS"
          value={metrics.roas.toFixed(2)}
          toneClass={TONE_TEXT_CLASS[roasTone(metrics.roas)]}
        />
        <Stat label="Days active" value={String(product.daysActive)} />
      </dl>
    </Card>
  );
}

function Stat({
  label,
  value,
  toneClass,
}: {
  label: string;
  value: string;
  toneClass?: string;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-caption text-text-muted">{label}</dt>
      <dd className={`text-mono ${toneClass ?? 'text-text'}`}>{value}</dd>
    </div>
  );
}
