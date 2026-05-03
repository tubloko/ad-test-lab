'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Loader2,
  Check,
  AlertTriangle,
  Trash2,
  Sigma,
  CalendarPlus,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DateRangeSelect } from '@/components/DateRangeSelect';
import { BackfillDialog } from '@/components/forms/BackfillDialog';
import { useGridNavigation } from '@/hooks/useGridNavigation';
import { cpa, roas } from '@/lib/metrics';
import { computeProfitWithFees } from '@/lib/metrics/profitWithFees';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate } from '@/lib/utils/formatDate';
import { todayInTimezone, subtractDays } from '@/lib/utils/date';
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
import { cn } from '@/lib/utils';
import type { EnrichedCampaignEntry } from '@/hooks/useCampaignEntries';
import type { CampaignEntryInput } from '@/types/entry';
import type { ProductFees } from '@/types/product';

interface CampaignEntriesTableProps {
  entries: EnrichedCampaignEntry[];
  /** Per-date sum of adset spend — drives the (read-only) Spend column. */
  adsetSpendByDate: Map<string, number>;
  targetCPA: number;
  timezone: string;
  productFees?: ProductFees;
  onSaveEntry: (date: string, values: CampaignEntryInput) => Promise<void>;
  onDeleteEntry: (date: string) => Promise<void>;
}

function rowProfit(
  revenue: number,
  spend: number,
  cogs: number,
  orders: number,
  fees?: ProductFees,
): number {
  return computeProfitWithFees({
    revenue,
    spend,
    cogs,
    orders,
    transactionFeePercent: fees?.transactionFeePercent,
    transactionFeeFixed: fees?.transactionFeeFixed,
    shippingCost: fees?.shippingCost,
    refundRate: fees?.refundRate,
  }).profit;
}

// Spend is editable but adsets win when they have data for the date.
const EDITABLE_COLS = ['spend', 'revenue', 'orders', 'cogs'] as const;
type EditableField = (typeof EDITABLE_COLS)[number];

interface RowDraft {
  spend: string;
  revenue: string;
  orders: string;
  cogs: string;
}

function toDraft(entry: EnrichedCampaignEntry): RowDraft {
  return {
    spend: entry.spend ? String(entry.spend) : '',
    revenue: entry.revenue ? String(entry.revenue) : '',
    orders: entry.orders ? String(entry.orders) : '',
    cogs: entry.cogs ? String(entry.cogs) : '',
  };
}

const EMPTY_DRAFT: RowDraft = { spend: '', revenue: '', orders: '', cogs: '' };

interface ExtraRow {
  tempId: string;
  date: string;
}

export function CampaignEntriesTable({
  entries,
  adsetSpendByDate,
  targetCPA,
  timezone,
  productFees,
  onSaveEntry,
  onDeleteEntry,
}: CampaignEntriesTableProps) {
  const [preset, setPreset] = useState<DateRangePreset>('14d');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const today = todayInTimezone(timezone);
  const fromDate = rangeStartDate(preset, today);

  const filtered = useMemo(
    () => entries.filter((e) => isWithinRange(e.date, fromDate, today)),
    [entries, fromDate, today],
  );

  const [extras, setExtras] = useState<ExtraRow[]>([
    { tempId: 'today-default', date: today },
  ]);

  // Maintain `extras` so the table always shows:
  //  • today (so the user can fill it in)
  //  • every date that has adset data but no campaign entry yet
  //  • whatever the user has explicitly backfilled
  // Any extra whose date now has a saved campaign entry is dropped — that
  // row is rendered as a SavedEntryRow instead.
  useEffect(() => {
    const savedDates = new Set(entries.map((e) => e.date));
    setExtras((prev) => {
      const next = prev.filter((r) => !savedDates.has(r.date));
      if (!savedDates.has(today) && !next.some((r) => r.date === today)) {
        next.unshift({ tempId: `today-${today}`, date: today });
      }
      for (const adsetDate of adsetSpendByDate.keys()) {
        if (savedDates.has(adsetDate)) continue;
        if (next.some((r) => r.date === adsetDate)) continue;
        next.push({ tempId: `adset-${adsetDate}`, date: adsetDate });
      }
      const sameAsBefore =
        next.length === prev.length && next.every((r, i) => r === prev[i]);
      return sameAsBefore ? prev : next;
    });
  }, [entries, today, adsetSpendByDate]);

  const [backfillOpen, setBackfillOpen] = useState(false);
  const [pendingFocusDate, setPendingFocusDate] = useState<string | null>(null);

  const handleBackfill = (dates: string[]) => {
    const existing = new Set([
      ...entries.map((e) => e.date),
      ...extras.map((r) => r.date),
    ]);
    const newRows: ExtraRow[] = [];
    let skipped = 0;
    let oldestNew: string | null = null;
    for (const d of dates) {
      if (existing.has(d)) {
        skipped++;
        continue;
      }
      newRows.push({ tempId: crypto.randomUUID(), date: d });
      if (!oldestNew || d < oldestNew) oldestNew = d;
    }
    setBackfillOpen(false);
    if (newRows.length === 0) {
      toast.info('All those dates already have rows.');
      // Still focus the oldest existing one so the user can find it.
      setPendingFocusDate(dates[0] ?? null);
      return;
    }
    setExtras((prev) => [...prev, ...newRows]);
    if (oldestNew) setPendingFocusDate(oldestNew);
    if (skipped > 0) {
      toast.success(`Added ${newRows.length} rows. ${skipped} dates already existed.`);
    } else {
      toast.success(`Added ${newRows.length} rows.`);
    }
  };

  // Single date-sorted list (old → new). Extras and saved entries share
  // one stable ordering so a row never jumps when it transitions from
  // local-draft to saved. Each visible row gets its grid index from this
  // list.
  type Row =
    | { kind: 'extra'; date: string; tempId: string }
    | { kind: 'saved'; date: string; entry: EnrichedCampaignEntry };
  const allRows = useMemo<Row[]>(() => {
    const fromExtras: Row[] = extras.map((r) => ({
      kind: 'extra',
      date: r.date,
      tempId: r.tempId,
    }));
    const fromEntries: Row[] = filtered.map((e) => ({
      kind: 'saved',
      date: e.date,
      entry: e,
    }));
    return [...fromExtras, ...fromEntries].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }, [extras, filtered]);

  const totalRows = allRows.length;
  const grid = useGridNavigation({
    rowCount: totalRows,
    colCount: EDITABLE_COLS.length,
  });

  // Totals mirror the verdict aggregator: adsets win for a date when
  // they have data; otherwise the campaign-entry's typed spend is used.
  const totals = useMemo(() => {
    const campaignByDate = new Map(filtered.map((e) => [e.date, e]));
    const allDates = new Set<string>(campaignByDate.keys());
    for (const date of adsetSpendByDate.keys()) {
      if (isWithinRange(date, fromDate, today)) allDates.add(date);
    }
    let spend = 0;
    let revenue = 0;
    let orders = 0;
    let cogsTotal = 0;
    for (const date of allDates) {
      if (adsetSpendByDate.has(date)) {
        spend += adsetSpendByDate.get(date) ?? 0;
      } else {
        spend += campaignByDate.get(date)?.spend ?? 0;
      }
      const ce = campaignByDate.get(date);
      if (ce) {
        revenue += ce.revenue;
        orders += ce.orders;
        cogsTotal += ce.cogs;
      }
    }
    return {
      spend,
      revenue,
      orders,
      cogs: cogsTotal,
      cpa: cpa(spend, orders),
      roas: roas(revenue, spend),
      profit: rowProfit(revenue, spend, cogsTotal, orders, productFees),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, adsetSpendByDate, fromDate, today, productFees?.transactionFeePercent, productFees?.transactionFeeFixed, productFees?.shippingCost, productFees?.refundRate]);

  // After we add a backfilled row (or detect duplicate), focus its spend cell.
  useEffect(() => {
    if (!pendingFocusDate) return;
    const idx = allRows.findIndex((r) => r.date === pendingFocusDate);
    if (idx >= 0) {
      grid.focusCell(idx, 0);
      setPendingFocusDate(null);
    }
  }, [pendingFocusDate, allRows, grid]);

  const hasHistorical =
    entries.some((e) => e.date !== today) || extras.some((r) => r.date !== today);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption text-text-muted">
          {filtered.length} {filtered.length === 1 ? 'day' : 'days'} in view
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setBackfillOpen(true)}
          >
            <CalendarPlus className="size-4" />
            Backfill past days
          </Button>
          <DateRangeSelect preset={preset} onPresetChange={setPreset} />
        </div>
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
            {allRows.map((r, idx) =>
              r.kind === 'extra' ? (
                <ExtraRowComponent
                  key={r.tempId}
                  row={idx}
                  today={today}
                  date={r.date}
                  adsetSpendSum={adsetSpendByDate.get(r.date) ?? 0}
                  targetCPA={targetCPA}
                  productFees={productFees}
                  grid={grid}
                  // Auto-derived rows (today, adset-only) re-appear after a
                  // local removal — hide the trash so users don't think it's
                  // doing nothing. User-backfilled rows have UUID tempIds.
                  removable={
                    !r.tempId.startsWith('today-') &&
                    !r.tempId.startsWith('adset-')
                  }
                  onSaveEntry={onSaveEntry}
                  onRemoveExtra={() =>
                    setExtras((prev) => prev.filter((x) => x.tempId !== r.tempId))
                  }
                />
              ) : (
                <SavedEntryRow
                  key={r.date}
                  row={idx}
                  today={today}
                  entry={r.entry}
                  targetCPA={targetCPA}
                  productFees={productFees}
                  grid={grid}
                  onSaveEntry={onSaveEntry}
                  onDeleteRequest={() => setPendingDelete(r.date)}
                />
              ),
            )}
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
                <TableCell className="text-right text-mono text-text">{totals.orders}</TableCell>
                <TableCell className="text-right text-mono text-text">
                  {formatCurrency(totals.cogs)}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right text-mono',
                    totals.orders > 0
                      ? TONE_TEXT_CLASS[cpaTone(totals.cpa, targetCPA)]
                      : 'text-text-muted',
                  )}
                >
                  {totals.orders > 0 ? formatCurrency(totals.cpa) : '—'}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right text-mono',
                    totals.spend > 0 ? TONE_TEXT_CLASS[roasTone(totals.roas)] : 'text-text-muted',
                  )}
                >
                  {totals.spend > 0 ? totals.roas.toFixed(2) : '—'}
                </TableCell>
                <TableCell
                  className={cn('text-right text-mono', TONE_TEXT_CLASS[profitTone(totals.profit)])}
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

      {!hasHistorical && (
        <p className="text-caption text-text-muted">
          Have historical data? Use{' '}
          <button
            type="button"
            className="underline-offset-2 hover:underline"
            onClick={() => setBackfillOpen(true)}
          >
            Backfill past days
          </button>{' '}
          to get a verdict faster.
        </p>
      )}

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

      <BackfillDialog
        open={backfillOpen}
        onOpenChange={setBackfillOpen}
        today={today}
        onBackfill={handleBackfill}
      />
    </div>
  );
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface ExtraRowProps {
  row: number;
  today: string;
  date: string;
  adsetSpendSum: number;
  targetCPA: number;
  productFees?: ProductFees;
  grid: ReturnType<typeof useGridNavigation>;
  removable: boolean;
  onSaveEntry: (date: string, values: CampaignEntryInput) => Promise<void>;
  onRemoveExtra: () => void;
}

function ExtraRowComponent({
  row,
  today,
  date,
  adsetSpendSum,
  targetCPA,
  productFees,
  grid,
  removable,
  onSaveEntry,
  onRemoveExtra,
}: ExtraRowProps) {
  const [draft, setDraft] = useState<RowDraft>(EMPTY_DRAFT);
  const initialRef = useRef<RowDraft>(draft);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    },
    [],
  );

  const adsetWins = adsetSpendSum > 0; // adset data for the date overrides

  const flushSave = async (next: RowDraft) => {
    setStatus('saving');
    try {
      await onSaveEntry(date, {
        spend: parseNum(next.spend),
        revenue: parseNum(next.revenue),
        orders: Math.round(parseNum(next.orders)),
        cogs: parseNum(next.cogs),
        spendOverride: false,
      });
      setStatus('saved');
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(() => setStatus('idle'), 1200);
    } catch {
      setStatus('error');
    }
  };

  const scheduleSave = (next: RowDraft) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void flushSave(next), 300);
  };

  const handleChange = (field: EditableField, raw: string) => {
    if (field === 'spend' && adsetWins) return; // ignore — adset wins
    const next = { ...draft, [field]: raw };
    setDraft(next);
    scheduleSave(next);
  };

  const handleBlur = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    void flushSave(draft);
  };

  const handleEsc = () => setDraft(initialRef.current);

  const orders = Math.round(parseNum(draft.orders));
  const revenue = parseNum(draft.revenue);
  const cogs = parseNum(draft.cogs);
  const spend = adsetWins ? adsetSpendSum : parseNum(draft.spend);
  const cpaValue = cpa(spend, orders);
  const roasValue = roas(revenue, spend);
  const profitValue = rowProfit(revenue, spend, cogs, orders, productFees);

  const isToday = date === today;
  const isUntouched =
    draft.spend === '' &&
    draft.revenue === '' &&
    draft.orders === '' &&
    draft.cogs === '';

  return (
    <TableRow className={cn(isToday && 'bg-elevated/40')}>
      <TableCell className="text-mono text-text">
        <DateCell
          date={date}
          today={today}
          showDraftPill={!isToday && isUntouched}
        />
      </TableCell>

      {EDITABLE_COLS.map((field, i) => (
        <TableCell key={field} className="text-right">
          <SpendOrInput
            field={field}
            adsetWins={adsetWins}
            adsetSpendSum={adsetSpendSum}
            value={draft[field]}
            inputRef={grid.getRef(row, i)}
            onChange={(v) => handleChange(field, v)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleEsc();
              grid.onKeyDown(row, i)(e);
            }}
            aria-label={`${field} on ${date}`}
            className="h-8 w-24 px-2 text-right text-mono"
          />
        </TableCell>
      ))}

      <TableCell
        className={cn(
          'text-right text-mono',
          orders > 0 ? TONE_TEXT_CLASS[cpaTone(cpaValue, targetCPA)] : 'text-text-muted',
        )}
      >
        {orders > 0 ? formatCurrency(cpaValue) : '—'}
      </TableCell>
      <TableCell
        className={cn(
          'text-right text-mono',
          spend > 0 ? TONE_TEXT_CLASS[roasTone(roasValue)] : 'text-text-muted',
        )}
      >
        {spend > 0 ? roasValue.toFixed(2) : '—'}
      </TableCell>
      <TableCell
        className={cn('text-right text-mono', TONE_TEXT_CLASS[profitTone(profitValue)])}
      >
        {formatCurrency(profitValue)}
      </TableCell>

      <TableCell className="w-8 text-center">
        <SaveIndicator status={status} />
      </TableCell>

      <TableCell className="w-10 text-right">
        {removable && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove this row"
            title="Remove this row"
            onClick={onRemoveExtra}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

interface SavedEntryRowProps {
  row: number;
  today: string;
  entry: EnrichedCampaignEntry;
  targetCPA: number;
  productFees?: ProductFees;
  grid: ReturnType<typeof useGridNavigation>;
  onSaveEntry: (date: string, values: CampaignEntryInput) => Promise<void>;
  onDeleteRequest: () => void;
}

function SavedEntryRow({
  row,
  today,
  entry,
  targetCPA,
  productFees,
  grid,
  onSaveEntry,
  onDeleteRequest,
}: SavedEntryRowProps) {
  const [draft, setDraft] = useState<RowDraft>(() => toDraft(entry));
  const initialRef = useRef<RowDraft>(draft);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const next = toDraft(entry);
    initialRef.current = next;
    setDraft((prev) => ({ ...next, ...dirtyFieldsOnly(prev, initialRef.current) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.spend, entry.revenue, entry.orders, entry.cogs, entry.date]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    },
    [],
  );

  const adsetWins = entry.adsetSpendSum > 0;

  const flushSave = async (next: RowDraft) => {
    setStatus('saving');
    try {
      await onSaveEntry(entry.date, {
        spend: parseNum(next.spend),
        revenue: parseNum(next.revenue),
        orders: Math.round(parseNum(next.orders)),
        cogs: parseNum(next.cogs),
        spendOverride: false,
      });
      setStatus('saved');
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(() => setStatus('idle'), 1200);
    } catch {
      setStatus('error');
    }
  };

  const scheduleSave = (next: RowDraft) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void flushSave(next), 300);
  };

  const handleChange = (field: EditableField, raw: string) => {
    if (field === 'spend' && adsetWins) return;
    const next = { ...draft, [field]: raw };
    setDraft(next);
    scheduleSave(next);
  };

  const handleBlur = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    void flushSave(draft);
  };

  const handleEsc = () => setDraft(initialRef.current);

  const orders = Math.round(parseNum(draft.orders));
  const revenue = parseNum(draft.revenue);
  const cogs = parseNum(draft.cogs);
  const spend = adsetWins ? entry.adsetSpendSum : parseNum(draft.spend);
  const cpaValue = cpa(spend, orders);
  const roasValue = roas(revenue, spend);
  const profitValue = rowProfit(revenue, spend, cogs, orders, productFees);

  const isToday = entry.date === today;

  return (
    <TableRow className={cn(isToday && 'bg-elevated/40')}>
      <TableCell className="text-mono text-text">
        <DateCell date={entry.date} today={today} />
      </TableCell>

      {EDITABLE_COLS.map((field, i) => (
        <TableCell key={field} className="text-right">
          <SpendOrInput
            field={field}
            adsetWins={adsetWins}
            adsetSpendSum={entry.adsetSpendSum}
            value={draft[field]}
            inputRef={grid.getRef(row, i)}
            onChange={(v) => handleChange(field, v)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleEsc();
              grid.onKeyDown(row, i)(e);
            }}
            aria-label={`${field} on ${entry.date}`}
            className="h-8 w-24 px-2 text-right text-mono"
          />
        </TableCell>
      ))}

      <TableCell
        className={cn(
          'text-right text-mono',
          orders > 0 ? TONE_TEXT_CLASS[cpaTone(cpaValue, targetCPA)] : 'text-text-muted',
        )}
      >
        {orders > 0 ? formatCurrency(cpaValue) : '—'}
      </TableCell>
      <TableCell
        className={cn(
          'text-right text-mono',
          spend > 0 ? TONE_TEXT_CLASS[roasTone(roasValue)] : 'text-text-muted',
        )}
      >
        {spend > 0 ? roasValue.toFixed(2) : '—'}
      </TableCell>
      <TableCell
        className={cn('text-right text-mono', TONE_TEXT_CLASS[profitTone(profitValue)])}
      >
        {formatCurrency(profitValue)}
      </TableCell>

      <TableCell className="w-8 text-center">
        <SaveIndicator status={status} />
      </TableCell>

      <TableCell className="w-10 text-right">
        {!isToday && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Delete entry for ${entry.date}`}
            onClick={onDeleteRequest}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

function DateCell({
  date,
  today,
  showDraftPill = false,
}: {
  date: string;
  today: string;
  showDraftPill?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="inline-flex h-8 items-center text-mono">{formatDate(date)}</span>
      {date === today && (
        <span className="rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-caption text-primary">
          today
        </span>
      )}
      {showDraftPill && (
        <span
          title="Not saved yet — type any value to persist"
          className="rounded-full border border-border-subtle bg-elevated px-1.5 py-0.5 text-caption text-text-muted"
        >
          Draft
        </span>
      )}
    </div>
  );
}

function SpendOrInput({
  field,
  adsetWins,
  adsetSpendSum,
  value,
  inputRef,
  onChange,
  onBlur,
  onKeyDown,
  ...rest
}: {
  field: EditableField;
  adsetWins: boolean;
  adsetSpendSum: number;
  value: string;
  inputRef: (el: HTMLInputElement | null) => void;
  onChange: (v: string) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  'aria-label': string;
  className: string;
}) {
  if (field === 'spend' && adsetWins) {
    return (
      <span
        title="Auto-summed from adsets — adsets override the daily-table spend when they have data for the date"
        className="inline-flex items-center justify-end gap-1 text-mono text-text-muted"
      >
        <Sigma className="size-3 text-text-subtle" />
        <span className="tabular-nums">{formatCurrency(adsetSpendSum)}</span>
      </span>
    );
  }

  return (
    <Input
      ref={inputRef}
      type="number"
      inputMode={field === 'orders' ? 'numeric' : 'decimal'}
      step={field === 'orders' ? '1' : '0.01'}
      min={0}
      value={value}
      placeholder="0"
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      aria-label={rest['aria-label']}
      className={rest.className}
    />
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'saving') {
    return <Loader2 className="size-4 animate-spin text-text-muted" aria-label="Saving" />;
  }
  if (status === 'saved') {
    return <Check className="size-4 text-success-text" aria-label="Saved" />;
  }
  if (status === 'error') {
    return <AlertTriangle className="size-4 text-danger-text" aria-label="Save failed" />;
  }
  return <span className="block size-4" aria-hidden />;
}

function parseNum(s: string): number {
  if (s === '' || s === null || s === undefined) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function dirtyFieldsOnly(current: RowDraft, initial: RowDraft): Partial<RowDraft> {
  const out: Partial<RowDraft> = {};
  for (const k of EDITABLE_COLS) if (current[k] !== initial[k]) out[k] = current[k];
  return out;
}

