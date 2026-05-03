'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { DateRangeSelect } from '@/components/DateRangeSelect';
import { useDateRangePreset } from '@/hooks/useDateRangePreset';
import { useCampaignEntries } from '@/hooks/useCampaignEntries';
import { useAdsets } from '@/hooks/useAdsets';
import { useAllAdsetEntries } from '@/hooks/useAllAdsetEntries';
import { aggregateCampaignForVerdict, type DateRange } from '@/lib/metrics/aggregate';
import { computeProfitWithFees } from '@/lib/metrics/profitWithFees';
import { rangeStartDate } from '@/lib/utils/dateRange';
import { todayInTimezone, getBrowserTimezone } from '@/lib/utils/date';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { profitTone, TONE_TEXT_CLASS } from '@/lib/utils/threshold-color';
import type { Campaign } from '@/types/campaign';
import type { ProductFees } from '@/types/product';

interface ProductKPISummaryProps {
  productId: string;
  campaigns: Campaign[];
  targetCPA: number;
  fees?: ProductFees;
}

interface CampaignTotals {
  spend: number;
  revenue: number;
  profit: number;
}

const ZERO: CampaignTotals = { spend: 0, revenue: 0, profit: 0 };

export function ProductKPISummary({
  productId,
  campaigns,
  targetCPA,
  fees,
}: ProductKPISummaryProps) {
  const { preset, setPreset } = useDateRangePreset('14d');
  const today = todayInTimezone(getBrowserTimezone());
  const fromDate = rangeStartDate(preset, today);
  const range = useMemo(() => ({ from: fromDate, to: today }), [fromDate, today]);

  const [byCampaign, setByCampaign] = useState<Record<string, CampaignTotals>>({});

  const publish = useCallback((id: string, t: CampaignTotals) => {
    setByCampaign((prev) => {
      const cur = prev[id];
      if (cur && cur.spend === t.spend && cur.revenue === t.revenue && cur.profit === t.profit) {
        return prev;
      }
      return { ...prev, [id]: t };
    });
  }, []);

  // Drop totals for campaigns that have been removed.
  useEffect(() => {
    const live = new Set(campaigns.map((c) => c.id));
    setByCampaign((prev) => {
      const next: Record<string, CampaignTotals> = {};
      for (const [id, v] of Object.entries(prev)) if (live.has(id)) next[id] = v;
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [campaigns]);

  const totals = useMemo(
    () =>
      Object.values(byCampaign).reduce(
        (acc, v) => ({
          spend: acc.spend + v.spend,
          revenue: acc.revenue + v.revenue,
          profit: acc.profit + v.profit,
        }),
        ZERO,
      ),
    [byCampaign],
  );

  const activeCount = campaigns.filter(
    (c) => c.status === 'testing' || c.status === 'scaled',
  ).length;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-caption text-text-muted">Across all campaigns</p>
        <DateRangeSelect preset={preset} onPresetChange={setPreset} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPICard label="Active campaigns" value={String(activeCount)} />
        <KPICard label="Total spend" value={formatCurrency(totals.spend)} />
        <KPICard label="Total revenue" value={formatCurrency(totals.revenue)} />
        <KPICard
          label="Profit"
          value={formatCurrency(totals.profit)}
          tone={TONE_TEXT_CLASS[profitTone(totals.profit)]}
        />
      </div>

      {/* Headless readers: one per campaign, each publishes its totals. */}
      {campaigns.map((c) => (
        <CampaignTotalsReader
          key={c.id}
          productId={productId}
          campaignId={c.id}
          targetCPA={targetCPA}
          fees={fees}
          range={range}
          onChange={publish}
        />
      ))}
    </section>
  );
}

function KPICard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <Card className="gap-2">
      <p className="text-caption text-text-muted">{label}</p>
      <p className={`text-display text-mono tabular-nums ${tone ?? 'text-text'}`}>
        {value}
      </p>
    </Card>
  );
}

function CampaignTotalsReader({
  productId,
  campaignId,
  targetCPA,
  fees,
  range,
  onChange,
}: {
  productId: string;
  campaignId: string;
  targetCPA: number;
  fees?: ProductFees;
  range: DateRange;
  onChange: (id: string, t: CampaignTotals) => void;
}) {
  const { data: entries } = useCampaignEntries(productId, campaignId);
  const { data: adsets } = useAdsets(productId, campaignId);
  const adsetIds = useMemo(() => adsets.map((a) => a.id), [adsets]);
  const { byAdsetId } = useAllAdsetEntries(productId, campaignId, adsetIds);

  const feesKey = `${fees?.transactionFeePercent ?? ''}|${fees?.transactionFeeFixed ?? ''}|${fees?.shippingCost ?? ''}|${fees?.refundRate ?? ''}`;

  const totals = useMemo<CampaignTotals>(() => {
    const adsetEntries = adsetIds.map((id) => byAdsetId[id] ?? []);
    const input = aggregateCampaignForVerdict(entries, adsetEntries, range, targetCPA, fees);
    const { profit } = computeProfitWithFees({
      revenue: input.totalRevenue,
      spend: input.totalSpend,
      cogs: input.totalCOGS,
      orders: input.totalOrders,
      transactionFeePercent: input.transactionFeePercent,
      transactionFeeFixed: input.transactionFeeFixed,
      shippingCost: input.shippingCost,
      refundRate: input.refundRate,
    });
    return {
      spend: input.totalSpend,
      revenue: input.totalRevenue,
      profit,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, adsetIds, byAdsetId, range, targetCPA, feesKey]);

  useEffect(() => {
    onChange(campaignId, totals);
  }, [campaignId, totals.spend, totals.revenue, totals.profit, onChange]);

  return null;
}
