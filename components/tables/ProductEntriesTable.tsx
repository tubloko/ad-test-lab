'use client';

import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  DailyEntryRow,
  type NumericFieldConfig,
} from '@/components/forms/DailyEntryRow';
import { DateRangeSelect } from '@/components/DateRangeSelect';
import { cpa, roas, profit } from '@/lib/metrics';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { todayInTimezone } from '@/lib/utils/date';
import {
  cpaTone,
  roasTone,
  profitTone,
  TONE_TEXT_CLASS,
} from '@/lib/utils/threshold-color';
import {
  rangeStartDate,
  isWithinRange,
  type DateRangePreset,
} from '@/lib/utils/dateRange';
// FIXME(refactor-1b): ProductEntry/ProductEntryInput removed — switch to CampaignEntry/CampaignEntryInput. Rename component to CampaignEntriesTable; bind spend column to displayedSpend with override toggle.
import type { ProductEntry, ProductEntryInput } from '@/types/entry';

interface ProductEntriesTableProps {
  entries: ProductEntry[];
  targetCPA: number;
  defaultCOGS?: number;
  timezone: string;
  onSaveEntry: (date: string, values: ProductEntryInput) => Promise<void>;
  onDeleteEntry: (date: string) => Promise<void>;
}

const FIELDS: NumericFieldConfig[] = [
  { key: 'spend', label: 'Spend', type: 'money' },
  { key: 'revenue', label: 'Revenue', type: 'money' },
  { key: 'orders', label: 'Orders', type: 'count' },
  { key: 'cogs', label: 'COGS', type: 'money' },
];

export function ProductEntriesTable({
  entries,
  targetCPA,
  defaultCOGS,
  timezone,
  onSaveEntry,
  onDeleteEntry,
}: ProductEntriesTableProps) {
  const [preset, setPreset] = useState<DateRangePreset>('14d');
  const [newRowKey, setNewRowKey] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const today = todayInTimezone(timezone);
  const fromDate = rangeStartDate(preset, today);

  const filtered = useMemo(
    () => entries.filter((e) => isWithinRange(e.date, fromDate, today)),
    [entries, fromDate, today],
  );

  const totals = useMemo(() => {
    const acc = filtered.reduce(
      (a, e) => ({
        spend: a.spend + e.spend,
        revenue: a.revenue + e.revenue,
        orders: a.orders + e.orders,
        cogs: a.cogs + e.cogs,
      }),
      { spend: 0, revenue: 0, orders: 0, cogs: 0 },
    );
    return {
      ...acc,
      cpa: cpa(acc.spend, acc.orders),
      roas: roas(acc.revenue, acc.spend),
      profit: profit(acc.revenue, acc.spend, acc.cogs),
    };
  }, [filtered]);

  const handleSave = async (date: string, values: Record<string, number>) => {
    await onSaveEntry(date, {
      spend: values.spend,
      revenue: values.revenue,
      orders: Math.round(values.orders),
      cogs: values.cogs,
    });
  };

  const handleSaveNew = async (date: string, values: Record<string, number>) => {
    await handleSave(date, values);
    setNewRowKey((n) => n + 1);
  };

  const todayValues: Record<string, number> = {
    spend: 0,
    revenue: 0,
    orders: 0,
    cogs: defaultCOGS ?? 0,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-caption text-text-muted">
          {filtered.length} {filtered.length === 1 ? 'day' : 'days'} in view
        </p>
        <DateRangeSelect preset={preset} onPresetChange={setPreset} />
      </div>

      <div className="rounded-lg border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">COGS</TableHead>
              <TableHead className="text-right">CPA</TableHead>
              <TableHead className="text-right">ROAS</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="w-8" />
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((entry) => (
              <DailyEntryRow
                key={entry.date}
                date={entry.date}
                initialValues={{
                  spend: entry.spend,
                  revenue: entry.revenue,
                  orders: entry.orders,
                  cogs: entry.cogs,
                }}
                fields={FIELDS}
                onSave={handleSave}
                renderComputed={(v) => (
                  <ProductComputedCells
                    spend={v.spend}
                    revenue={v.revenue}
                    orders={v.orders}
                    cogs={v.cogs}
                    targetCPA={targetCPA}
                  />
                )}
                renderActions={() => (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete entry for ${entry.date}`}
                    onClick={() => setPendingDelete(entry.date)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              />
            ))}
            <DailyEntryRow
              key={`new-${newRowKey}`}
              date={today}
              initialValues={todayValues}
              fields={FIELDS}
              onSave={handleSaveNew}
              isNew
              renderComputed={(v) => (
                <ProductComputedCells
                  spend={v.spend}
                  revenue={v.revenue}
                  orders={v.orders}
                  cogs={v.cogs}
                  targetCPA={targetCPA}
                />
              )}
            />
          </TableBody>
          {filtered.length > 0 && (
            <TableFooter>
              <TableRow className="bg-elevated">
                <TableCell className="text-subheading text-text">Total</TableCell>
                <TableCell className="text-right text-mono text-text">
                  {formatCurrency(totals.spend)}
                </TableCell>
                <TableCell className="text-right text-mono text-text">
                  {formatCurrency(totals.revenue)}
                </TableCell>
                <TableCell className="text-right text-mono text-text">
                  {totals.orders}
                </TableCell>
                <TableCell className="text-right text-mono text-text">
                  {formatCurrency(totals.cogs)}
                </TableCell>
                <TableCell
                  className={`text-right text-mono ${TONE_TEXT_CLASS[cpaTone(totals.cpa, targetCPA)]}`}
                >
                  {totals.orders > 0 ? formatCurrency(totals.cpa) : '—'}
                </TableCell>
                <TableCell
                  className={`text-right text-mono ${TONE_TEXT_CLASS[roasTone(totals.roas)]}`}
                >
                  {totals.spend > 0 ? totals.roas.toFixed(2) : '—'}
                </TableCell>
                <TableCell
                  className={`text-right text-mono ${TONE_TEXT_CLASS[profitTone(totals.profit)]}`}
                >
                  {formatCurrency(totals.profit)}
                </TableCell>
                <TableCell />
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={pendingDelete ? `Delete entry for ${pendingDelete}?` : ''}
        description="This will permanently remove the daily entry."
        onConfirm={async () => {
          if (pendingDelete) await onDeleteEntry(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

interface ProductComputedCellsProps {
  spend: number;
  revenue: number;
  orders: number;
  cogs: number;
  targetCPA: number;
}

function ProductComputedCells({
  spend,
  revenue,
  orders,
  cogs,
  targetCPA,
}: ProductComputedCellsProps) {
  const cpaValue = cpa(spend, orders);
  const roasValue = roas(revenue, spend);
  const profitValue = profit(revenue, spend, cogs);
  return (
    <>
      <TableCell
        className={`text-right text-mono ${TONE_TEXT_CLASS[cpaTone(cpaValue, targetCPA)]}`}
      >
        {orders > 0 ? formatCurrency(cpaValue) : '—'}
      </TableCell>
      <TableCell
        className={`text-right text-mono ${TONE_TEXT_CLASS[roasTone(roasValue)]}`}
      >
        {spend > 0 ? roasValue.toFixed(2) : '—'}
      </TableCell>
      <TableCell
        className={`text-right text-mono ${TONE_TEXT_CLASS[profitTone(profitValue)]}`}
      >
        {formatCurrency(profitValue)}
      </TableCell>
    </>
  );
}
