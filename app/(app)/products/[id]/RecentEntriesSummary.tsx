'use client';

import { Card } from '@/components/ui/card';
import { cpa, profit } from '@/lib/metrics';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate } from '@/lib/utils/formatDate';
import {
  cpaTone,
  profitTone,
  TONE_TEXT_CLASS,
} from '@/lib/utils/threshold-color';
import type { ProductEntry } from '@/types/entry';

interface RecentEntriesSummaryProps {
  entries: ProductEntry[];
  targetCPA: number;
  limit?: number;
}

export function RecentEntriesSummary({
  entries,
  targetCPA,
  limit = 5,
}: RecentEntriesSummaryProps) {
  const recent = entries.slice(0, limit);

  return (
    <Card className="gap-3">
      <p className="text-subheading text-text">Recent days</p>
      {recent.length === 0 ? (
        <p className="text-caption text-text-muted">
          No entries yet. Add your first day below.
        </p>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {recent.map((e) => {
            const c = cpa(e.spend, e.orders);
            const p = profit(e.revenue, e.spend, e.cogs);
            return (
              <li
                key={e.date}
                className="flex items-center justify-between py-2 text-caption"
              >
                <span className="text-text">{formatDate(e.date)}</span>
                <span className="flex items-center gap-3 text-mono">
                  <span className={TONE_TEXT_CLASS[cpaTone(c, targetCPA)]}>
                    {e.orders > 0 ? formatCurrency(c) : '—'}
                  </span>
                  <span className={TONE_TEXT_CLASS[profitTone(p)]}>
                    {formatCurrency(p)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
