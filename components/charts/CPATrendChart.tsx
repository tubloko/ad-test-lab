'use client';

import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/EmptyState';
import { cpa } from '@/lib/metrics';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate } from '@/lib/utils/formatDate';
import { isWithinRange } from '@/lib/utils/dateRange';
import type { EnrichedCampaignEntry } from '@/hooks/useCampaignEntries';

interface CPATrendChartProps {
  entries: EnrichedCampaignEntry[];
  targetCPA: number;
  fromDate: string | null;
  toDate: string;
}

export function CPATrendChart({
  entries,
  targetCPA,
  fromDate,
  toDate,
}: CPATrendChartProps) {
  const data = useMemo(() => {
    return entries
      .filter((e) => isWithinRange(e.date, fromDate, toDate))
      .filter((e) => e.orders > 0)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({
        date: e.date,
        cpa: cpa(e.effectiveSpend, e.orders),
      }));
  }, [entries, fromDate, toDate]);

  if (data.length === 0) {
    return (
      <Card>
        <p className="text-subheading text-text">Daily CPA</p>
        <EmptyState icon={Activity} title="No orders in this range" />
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-subheading text-text">Daily CPA</p>
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
              tickFormatter={(v) => `$${v}`}
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
              formatter={(v) => formatCurrency(Number(v))}
            />
            <ReferenceLine
              y={targetCPA}
              stroke="var(--primary)"
              strokeDasharray="4 4"
              label={{
                value: `Target $${targetCPA}`,
                position: 'insideTopRight',
                fill: 'var(--primary)',
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="cpa"
              stroke="var(--text)"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload, key } = props;
                const overTarget = payload.cpa > targetCPA;
                return (
                  <circle
                    key={key}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={overTarget ? 'var(--danger-bg)' : 'var(--success-bg)'}
                    stroke="var(--bg)"
                    strokeWidth={1}
                  />
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
