'use client';

import { useMemo } from 'react';
import { useVerdict } from '@/hooks/useVerdict';
import { useDateRangePreset } from '@/hooks/useDateRangePreset';
import { rangeStartDate } from '@/lib/utils/dateRange';
import { todayInTimezone, getBrowserTimezone } from '@/lib/utils/date';
import { VerdictPanel } from '@/components/verdict/VerdictPanel';
import { SpendVsRevenueChart } from '@/components/charts/SpendVsRevenueChart';
import { CPATrendChart } from '@/components/charts/CPATrendChart';
import { RecentEntriesSummary } from './RecentEntriesSummary';
// FIXME(refactor-1b): ProductEntry is gone — use CampaignEntry. This component now belongs under a campaign route.
import type { ProductEntry, AdsetEntry } from '@/types/entry';

interface ProductOverviewProps {
  productEntries: ProductEntry[];
  adsetEntriesByAdsetId: Record<string, AdsetEntry[]>;
  targetCPA: number;
}

export function ProductOverview({
  productEntries,
  adsetEntriesByAdsetId,
  targetCPA,
}: ProductOverviewProps) {
  const { preset, setPreset } = useDateRangePreset('14d');
  const today = todayInTimezone(getBrowserTimezone());
  const fromDate = rangeStartDate(preset, today);
  const range = useMemo(() => ({ from: fromDate, to: today }), [fromDate, today]);

  const adsetEntries = useMemo(
    () => Object.values(adsetEntriesByAdsetId),
    [adsetEntriesByAdsetId],
  );

  // FIXME(refactor-1b): useVerdict args renamed (campaignEntries, not productEntries) and the bundle field is now `input`, not `product`.
  const { result, product } = useVerdict({
    productEntries,
    adsetEntries,
    targetCPA,
    range,
  });

  return (
    <div className="space-y-6">
      <VerdictPanel
        result={result}
        product={product}
        targetCPA={targetCPA}
        preset={preset}
        onPresetChange={setPreset}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SpendVsRevenueChart
            entries={productEntries}
            fromDate={fromDate}
            toDate={today}
          />
          <CPATrendChart
            entries={productEntries}
            targetCPA={targetCPA}
            fromDate={fromDate}
            toDate={today}
          />
        </div>
        <RecentEntriesSummary entries={productEntries} targetCPA={targetCPA} />
      </div>
    </div>
  );
}
