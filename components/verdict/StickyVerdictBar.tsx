'use client';

import type { VerdictResult } from '@/lib/verdict-engine';
import type { VerdictInput } from '@/lib/verdict-engine';
import { DateRangeSelect } from '@/components/DateRangeSelect';
import { VerdictBadge } from './VerdictBadge';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import {
  cpaTone,
  roasTone,
  profitTone,
  TONE_TEXT_CLASS,
} from '@/lib/utils/threshold-color';
import type { DateRangePreset } from '@/lib/utils/dateRange';

interface StickyVerdictBarProps {
  result: VerdictResult;
  input: VerdictInput;
  targetCPA: number;
  preset: DateRangePreset;
  onPresetChange: (preset: DateRangePreset) => void;
}

export function StickyVerdictBar({
  result,
  input,
  targetCPA,
  preset,
  onPresetChange,
}: StickyVerdictBarProps) {
  const m = result.metrics;
  const hasOrders = input.totalOrders > 0;

  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-bg/85 px-4 py-3 backdrop-blur-md md:-mx-8 md:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <VerdictBadge verdict={result.verdict} size="md" />

        <p className="min-w-0 flex-1 text-caption text-text-muted">
          {result.reason}
        </p>

        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-caption text-text-muted">
          <Stat
            label="CPA"
            value={hasOrders ? formatCurrency(m.cpa) : '—'}
            tone={hasOrders ? TONE_TEXT_CLASS[cpaTone(m.cpa, targetCPA)] : 'text-text-muted'}
            sub={`/ ${formatCurrency(targetCPA)}`}
          />
          <Stat
            label="ROAS"
            value={input.totalSpend > 0 ? m.roas.toFixed(2) : '—'}
            tone={input.totalSpend > 0 ? TONE_TEXT_CLASS[roasTone(m.roas)] : 'text-text-muted'}
          />
          <Stat
            label="Profit"
            value={formatCurrency(m.profit)}
            tone={TONE_TEXT_CLASS[profitTone(m.profit)]}
          />
          <Stat
            label="Days"
            value={String(input.daysActive)}
            tone="text-text"
          />
        </div>

        <DateRangeSelect preset={preset} onPresetChange={onPresetChange} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone: string;
  sub?: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span>{label}</span>
      <span className={`text-mono tabular-nums ${tone}`}>{value}</span>
      {sub && <span className="text-text-subtle">{sub}</span>}
    </span>
  );
}
