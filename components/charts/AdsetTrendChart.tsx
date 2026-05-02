'use client';

import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LineChart as LineChartIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/EmptyState';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { lpvRate, atcRate, icRate, purchaseRate } from '@/lib/metrics';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatPercent } from '@/lib/utils/formatPercent';
import { formatDate } from '@/lib/utils/formatDate';
import { isWithinRange } from '@/lib/utils/dateRange';
import type { Adset } from '@/types/adset';
import type { AdsetEntry } from '@/types/entry';

type MetricKey = 'cpc' | 'lpvRate' | 'atcRate' | 'icRate' | 'convRate' | 'spend' | 'clicks';

interface MetricDef {
  key: MetricKey;
  label: string;
  format: (v: number) => string;
  yTickFormatter: (v: number) => string;
  compute: (e: AdsetEntry) => number | null;
}

const METRICS: MetricDef[] = [
  {
    key: 'cpc',
    label: 'CPC',
    format: (v) => formatCurrency(v),
    yTickFormatter: (v) => `$${v}`,
    compute: (e) => (e.clicks > 0 ? e.spend / e.clicks : null),
  },
  {
    key: 'lpvRate',
    label: 'LPV%',
    format: (v) => formatPercent(v),
    yTickFormatter: (v) => `${v}%`,
    compute: (e) => (e.clicks > 0 ? lpvRate(e.lpv, e.clicks) : null),
  },
  {
    key: 'atcRate',
    label: 'ATC%',
    format: (v) => formatPercent(v),
    yTickFormatter: (v) => `${v}%`,
    compute: (e) => (e.lpv > 0 ? atcRate(e.atc, e.lpv) : null),
  },
  {
    key: 'icRate',
    label: 'IC%',
    format: (v) => formatPercent(v),
    yTickFormatter: (v) => `${v}%`,
    compute: (e) => (e.atc > 0 ? icRate(e.ic, e.atc) : null),
  },
  {
    key: 'convRate',
    label: 'Conv%',
    format: (v) => formatPercent(v),
    yTickFormatter: (v) => `${v}%`,
    compute: (e) => (e.ic > 0 ? purchaseRate(e.purchases ?? 0, e.ic) : null),
  },
  {
    key: 'spend',
    label: 'Spend',
    format: (v) => formatCurrency(v),
    yTickFormatter: (v) => `$${v}`,
    compute: (e) => e.spend,
  },
  {
    key: 'clicks',
    label: 'Clicks',
    format: (v) => String(v),
    yTickFormatter: (v) => String(v),
    compute: (e) => e.clicks,
  },
];

// Brand palette for adset lines. Cycles if there are more adsets than colors.
const PALETTE = [
  'var(--primary)',
  'var(--success-bg)',
  'var(--info-bg)',
  'var(--warning-bg)',
  'var(--danger-bg)',
  'var(--text)',
];

interface AdsetTrendChartProps {
  adsets: Adset[];
  byAdsetId: Record<string, AdsetEntry[]>;
  fromDate: string | null;
  toDate: string;
}

export function AdsetTrendChart({
  adsets,
  byAdsetId,
  fromDate,
  toDate,
}: AdsetTrendChartProps) {
  const [metricKey, setMetricKey] = useState<MetricKey>('cpc');
  const metric = METRICS.find((m) => m.key === metricKey)!;

  const data = useMemo(() => {
    // Build a row per date present in any adset, with one column per adset.
    const byDate = new Map<string, Record<string, number | null>>();
    for (const adset of adsets) {
      for (const e of byAdsetId[adset.id] ?? []) {
        if (!isWithinRange(e.date, fromDate, toDate)) continue;
        const row = byDate.get(e.date) ?? {};
        row[adset.id] = metric.compute(e);
        byDate.set(e.date, row);
      }
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({ date, ...values }));
  }, [adsets, byAdsetId, metric, fromDate, toDate]);

  const header = (
    <div className="flex items-center justify-between gap-3">
      <p className="text-subheading text-text">Adset trends</p>
      <Select value={metricKey} onValueChange={(v) => setMetricKey(v as MetricKey)}>
        <SelectTrigger size="sm" className="min-w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {METRICS.map((m) => (
            <SelectItem key={m.key} value={m.key}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  if (adsets.length === 0 || data.length === 0) {
    return (
      <Card>
        {header}
        <EmptyState
          icon={LineChartIcon}
          title="Not enough adset data yet"
          description="Add a few days of adset numbers to see trends."
        />
      </Card>
    );
  }

  return (
    <Card>
      {header}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              stroke="var(--text-muted)"
              tickFormatter={(d) => formatDate(d)}
              fontSize={12}
            />
            <YAxis
              stroke="var(--text-muted)"
              tickFormatter={(v) => metric.yTickFormatter(Number(v))}
              fontSize={12}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--elevated)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
              }}
              labelFormatter={(d) => formatDate(String(d))}
              formatter={(v, name) => {
                const adset = adsets.find((a) => a.id === name);
                return [metric.format(Number(v)), adset?.name ?? String(name)];
              }}
            />
            <Legend
              wrapperStyle={{ color: 'var(--text-muted)', fontSize: 12 }}
              formatter={(value) => {
                const adset = adsets.find((a) => a.id === value);
                return adset?.name ?? String(value);
              }}
            />
            {adsets.map((adset, i) => (
              <Line
                key={adset.id}
                type="monotone"
                dataKey={adset.id}
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
