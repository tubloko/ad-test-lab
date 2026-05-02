'use client';

import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/EmptyState';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate } from '@/lib/utils/formatDate';
import { isWithinRange } from '@/lib/utils/dateRange';
import type { ProductEntry } from '@/types/entry';

interface SpendVsRevenueChartProps {
  entries: ProductEntry[];
  fromDate: string | null;
  toDate: string;
}

export function SpendVsRevenueChart({
  entries,
  fromDate,
  toDate,
}: SpendVsRevenueChartProps) {
  const data = useMemo(() => {
    return entries
      .filter((e) => isWithinRange(e.date, fromDate, toDate))
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({
        date: e.date,
        Spend: e.spend,
        Revenue: e.revenue,
      }));
  }, [entries, fromDate, toDate]);

  if (data.length === 0) {
    return (
      <Card>
        <p className="text-subheading text-text">Spend vs Revenue</p>
        <EmptyState icon={TrendingUp} title="No entries in this range" />
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-subheading text-text">Spend vs Revenue</p>
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
            <Legend wrapperStyle={{ color: 'var(--text-muted)', fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="Spend"
              stroke="var(--danger-bg)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="Revenue"
              stroke="var(--success-bg)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
