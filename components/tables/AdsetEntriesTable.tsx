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
import { lpvRate, atcRate, icRate } from '@/lib/metrics';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatPercent } from '@/lib/utils/formatPercent';
import { todayInTimezone } from '@/lib/utils/date';
import {
  rateTone,
  HEALTHY_LPV_RATE,
  HEALTHY_ATC_RATE,
  HEALTHY_IC_RATE,
  TONE_TEXT_CLASS,
} from '@/lib/utils/threshold-color';
import {
  rangeStartDate,
  isWithinRange,
  type DateRangePreset,
} from '@/lib/utils/dateRange';
import type { AdsetEntry, AdsetEntryInput } from '@/types/entry';

interface AdsetEntriesTableProps {
  entries: AdsetEntry[];
  timezone: string;
  onSaveEntry: (date: string, values: AdsetEntryInput) => Promise<void>;
  onDeleteEntry: (date: string) => Promise<void>;
}

const FIELDS: NumericFieldConfig[] = [
  { key: 'spend', label: 'Spend', type: 'money' },
  { key: 'clicks', label: 'Clicks', type: 'count' },
  { key: 'lpv', label: 'LPV', type: 'count' },
  { key: 'atc', label: 'ATC', type: 'count' },
  { key: 'ic', label: 'IC', type: 'count' },
];

export function AdsetEntriesTable({
  entries,
  timezone,
  onSaveEntry,
  onDeleteEntry,
}: AdsetEntriesTableProps) {
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
        clicks: a.clicks + e.clicks,
        lpv: a.lpv + e.lpv,
        atc: a.atc + e.atc,
        ic: a.ic + e.ic,
      }),
      { spend: 0, clicks: 0, lpv: 0, atc: 0, ic: 0 },
    );
    return {
      ...acc,
      cpc: acc.clicks > 0 ? acc.spend / acc.clicks : 0,
      lpvRate: lpvRate(acc.lpv, acc.clicks),
      atcRate: atcRate(acc.atc, acc.lpv),
      icRate: icRate(acc.ic, acc.atc),
    };
  }, [filtered]);

  const handleSave = async (date: string, values: Record<string, number>) => {
    await onSaveEntry(date, {
      spend: values.spend,
      clicks: Math.round(values.clicks),
      lpv: Math.round(values.lpv),
      atc: Math.round(values.atc),
      ic: Math.round(values.ic),
    });
  };

  const handleSaveNew = async (date: string, values: Record<string, number>) => {
    await handleSave(date, values);
    setNewRowKey((n) => n + 1);
  };

  const newRowValues: Record<string, number> = {
    spend: 0,
    clicks: 0,
    lpv: 0,
    atc: 0,
    ic: 0,
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
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead className="text-right">LPV</TableHead>
              <TableHead className="text-right">ATC</TableHead>
              <TableHead className="text-right">IC</TableHead>
              <TableHead className="text-right">CPC</TableHead>
              <TableHead className="text-right">LPV%</TableHead>
              <TableHead className="text-right">ATC%</TableHead>
              <TableHead className="text-right">IC%</TableHead>
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
                  clicks: entry.clicks,
                  lpv: entry.lpv,
                  atc: entry.atc,
                  ic: entry.ic,
                }}
                fields={FIELDS}
                onSave={handleSave}
                renderComputed={(v) => <AdsetComputedCells values={v} />}
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
              initialValues={newRowValues}
              fields={FIELDS}
              onSave={handleSaveNew}
              isNew
              renderComputed={(v) => <AdsetComputedCells values={v} />}
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
                  {totals.clicks}
                </TableCell>
                <TableCell className="text-right text-mono text-text">
                  {totals.lpv}
                </TableCell>
                <TableCell className="text-right text-mono text-text">
                  {totals.atc}
                </TableCell>
                <TableCell className="text-right text-mono text-text">
                  {totals.ic}
                </TableCell>
                <TableCell className="text-right text-mono text-text">
                  {totals.clicks > 0 ? formatCurrency(totals.cpc) : '—'}
                </TableCell>
                <TableCell
                  className={`text-right text-mono ${TONE_TEXT_CLASS[rateTone(totals.lpvRate, HEALTHY_LPV_RATE)]}`}
                >
                  {totals.clicks > 0 ? formatPercent(totals.lpvRate) : '—'}
                </TableCell>
                <TableCell
                  className={`text-right text-mono ${TONE_TEXT_CLASS[rateTone(totals.atcRate, HEALTHY_ATC_RATE)]}`}
                >
                  {totals.lpv > 0 ? formatPercent(totals.atcRate) : '—'}
                </TableCell>
                <TableCell
                  className={`text-right text-mono ${TONE_TEXT_CLASS[rateTone(totals.icRate, HEALTHY_IC_RATE)]}`}
                >
                  {totals.atc > 0 ? formatPercent(totals.icRate) : '—'}
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

function AdsetComputedCells({ values }: { values: Record<string, number> }) {
  const cpc = values.clicks > 0 ? values.spend / values.clicks : 0;
  const lpv = lpvRate(values.lpv, values.clicks);
  const atc = atcRate(values.atc, values.lpv);
  const ic = icRate(values.ic, values.atc);
  return (
    <>
      <TableCell className="text-right text-mono text-text">
        {values.clicks > 0 ? formatCurrency(cpc) : '—'}
      </TableCell>
      <TableCell
        className={`text-right text-mono ${TONE_TEXT_CLASS[rateTone(lpv, HEALTHY_LPV_RATE)]}`}
      >
        {values.clicks > 0 ? formatPercent(lpv) : '—'}
      </TableCell>
      <TableCell
        className={`text-right text-mono ${TONE_TEXT_CLASS[rateTone(atc, HEALTHY_ATC_RATE)]}`}
      >
        {values.lpv > 0 ? formatPercent(atc) : '—'}
      </TableCell>
      <TableCell
        className={`text-right text-mono ${TONE_TEXT_CLASS[rateTone(ic, HEALTHY_IC_RATE)]}`}
      >
        {values.atc > 0 ? formatPercent(ic) : '—'}
      </TableCell>
    </>
  );
}
