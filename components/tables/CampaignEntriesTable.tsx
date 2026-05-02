'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2,
  Check,
  AlertTriangle,
  Sigma,
  Pencil,
  RotateCcw,
  Trash2,
  Plus,
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
import { useGridNavigation } from '@/hooks/useGridNavigation';
import { cpa, roas, profit } from '@/lib/metrics';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { todayInTimezone, dayBefore } from '@/lib/utils/date';
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

interface CampaignEntriesTableProps {
  entries: EnrichedCampaignEntry[];
  /** Sum of adset spend per date — needed for the auto-fill on rows that
   *  don't have a saved campaign entry yet. */
  adsetSpendByDate: Map<string, number>;
  targetCPA: number;
  timezone: string;
  onSaveEntry: (date: string, values: CampaignEntryInput) => Promise<void>;
  onClearOverride: (date: string) => Promise<void>;
  onDeleteEntry: (date: string) => Promise<void>;
}

const EDITABLE_COLS = ['spend', 'revenue', 'orders', 'cogs'] as const;
type EditableField = (typeof EDITABLE_COLS)[number];

interface RowDraft {
  spend: string;
  revenue: string;
  orders: string;
  cogs: string;
  spendOverride: boolean;
}

function toDraft(entry: EnrichedCampaignEntry): RowDraft {
  return {
    spend: entry.spendOverride ? String(entry.spend) : String(entry.displayedSpend),
    revenue: entry.revenue ? String(entry.revenue) : '',
    orders: entry.orders ? String(entry.orders) : '',
    cogs: entry.cogs ? String(entry.cogs) : '',
    spendOverride: entry.spendOverride,
  };
}

const EMPTY_DRAFT: RowDraft = {
  spend: '',
  revenue: '',
  orders: '',
  cogs: '',
  spendOverride: false,
};

interface ExtraRow {
  tempId: string;
  date: string;
}

export function CampaignEntriesTable({
  entries,
  adsetSpendByDate,
  targetCPA,
  timezone,
  onSaveEntry,
  onClearOverride,
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

  // Local extras: rows that exist in the table but don't yet have a saved
  // entry. Today is auto-added as an extra when no saved entry exists for it.
  const [extras, setExtras] = useState<ExtraRow[]>([
    { tempId: 'today-default', date: today },
  ]);

  useEffect(() => {
    const savedDates = new Set(entries.map((e) => e.date));
    setExtras((prev) => {
      let next = prev.filter((r) => !savedDates.has(r.date));
      if (!savedDates.has(today) && !next.some((r) => r.date === today)) {
        next = [{ tempId: `today-${today}`, date: today }, ...next];
      }
      return next.length === prev.length && next.every((r, i) => r === prev[i])
        ? prev
        : next;
    });
  }, [entries, today]);

  const handleAddRow = () => {
    const allDates = [...filtered.map((e) => e.date), ...extras.map((r) => r.date)];
    const oldest = allDates.length > 0 ? allDates.reduce((a, b) => (a < b ? a : b)) : today;
    const candidate = dayBefore(oldest);
    setExtras((prev) => [...prev, { tempId: crypto.randomUUID(), date: candidate }]);
  };

  // Sort: extras first (DESC by date), then saved entries (DESC).
  const sortedExtras = useMemo(
    () => [...extras].sort((a, b) => b.date.localeCompare(a.date)),
    [extras],
  );
  const sortedEntries = useMemo(
    () => [...filtered].sort((a, b) => b.date.localeCompare(a.date)),
    [filtered],
  );

  const totalRows = sortedExtras.length + sortedEntries.length;
  const grid = useGridNavigation({
    rowCount: totalRows,
    colCount: EDITABLE_COLS.length,
  });

  // Totals include dates that only have adset spend (no campaign entry yet)
  // — mirrors the verdict aggregator so the table footer agrees with the
  // sticky verdict bar.
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
      const ce = campaignByDate.get(date);
      spend += ce?.spendOverride ? ce.spend : adsetSpendByDate.get(date) ?? 0;
      revenue += ce?.revenue ?? 0;
      orders += ce?.orders ?? 0;
      cogsTotal += ce?.cogs ?? 0;
    }
    return {
      spend,
      revenue,
      orders,
      cogs: cogsTotal,
      cpa: cpa(spend, orders),
      roas: roas(revenue, spend),
      profit: profit(revenue, spend, cogsTotal),
    };
  }, [filtered, adsetSpendByDate, fromDate, today]);

  const usedDates = useMemo(() => {
    const s = new Set<string>();
    for (const e of entries) s.add(e.date);
    for (const r of extras) s.add(r.date);
    return s;
  }, [entries, extras]);

  const handleExtraDateChange = (tempId: string, newDate: string) => {
    setExtras((prev) =>
      prev.map((r) => (r.tempId === tempId ? { ...r, date: newDate } : r)),
    );
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
            {sortedExtras.map((extra, idx) => (
              <ExtraRowComponent
                key={extra.tempId}
                row={idx}
                today={today}
                date={extra.date}
                adsetSpendSum={adsetSpendByDate.get(extra.date) ?? 0}
                targetCPA={targetCPA}
                grid={grid}
                usedDates={usedDates}
                onSaveEntry={onSaveEntry}
                onDateChange={(d) => handleExtraDateChange(extra.tempId, d)}
                onRemoveExtra={() =>
                  setExtras((prev) => prev.filter((r) => r.tempId !== extra.tempId))
                }
              />
            ))}
            {sortedEntries.map((entry, idx) => (
              <SavedEntryRow
                key={entry.date}
                row={idx + sortedExtras.length}
                today={today}
                entry={entry}
                targetCPA={targetCPA}
                grid={grid}
                usedDates={usedDates}
                onSaveEntry={onSaveEntry}
                onClearOverride={onClearOverride}
                onDeleteEntry={onDeleteEntry}
                onDeleteRequest={() => setPendingDelete(entry.date)}
              />
            ))}
            <TableRow>
              <TableCell colSpan={10} className="py-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddRow}
                  className="text-text-muted hover:text-text"
                >
                  <Plus className="size-4" />
                  Add row
                </Button>
              </TableCell>
            </TableRow>
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
                  className={cn(
                    'text-right text-mono',
                    TONE_TEXT_CLASS[profitTone(totals.profit)],
                  )}
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

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface ExtraRowProps {
  row: number;
  today: string;
  date: string;
  adsetSpendSum: number;
  targetCPA: number;
  grid: ReturnType<typeof useGridNavigation>;
  usedDates: Set<string>;
  onSaveEntry: (date: string, values: CampaignEntryInput) => Promise<void>;
  onDateChange: (date: string) => void;
  onRemoveExtra: () => void;
}

function ExtraRowComponent({
  row,
  today,
  date,
  adsetSpendSum,
  targetCPA,
  grid,
  usedDates,
  onSaveEntry,
  onDateChange,
  onRemoveExtra,
}: ExtraRowProps) {
  const [draft, setDraft] = useState<RowDraft>(EMPTY_DRAFT);
  const initialRef = useRef<RowDraft>(draft);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingDate, setPendingDate] = useState<string>(date);

  useEffect(() => setPendingDate(date), [date]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    },
    [],
  );

  const flushSave = async (next: RowDraft) => {
    setStatus('saving');
    try {
      // When override is on, write the user's spend. When off, write the
      // current auto-fill value as a cache (the display layer recomputes
      // from adsets on read regardless).
      const spend = next.spendOverride ? parseNum(next.spend) : adsetSpendSum;
      await onSaveEntry(date, {
        spend,
        revenue: parseNum(next.revenue),
        orders: Math.round(parseNum(next.orders)),
        cogs: parseNum(next.cogs),
        spendOverride: next.spendOverride,
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
    const next = { ...draft, [field]: raw };
    if (field === 'spend') next.spendOverride = true;
    setDraft(next);
    scheduleSave(next);
  };

  const handleBlur = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    void flushSave(draft);
  };

  const handleEsc = () => setDraft(initialRef.current);

  const handleResetSpend = () => {
    const next = { ...draft, spend: '', spendOverride: false };
    setDraft(next);
    scheduleSave(next);
  };

  const handleDateBlur = () => {
    if (pendingDate === date) return;
    if (!isValidDate(pendingDate) || (usedDates.has(pendingDate) && pendingDate !== date)) {
      setPendingDate(date);
      return;
    }
    onDateChange(pendingDate);
  };

  const orders = parseNum(draft.orders);
  const revenue = parseNum(draft.revenue);
  const cogs = parseNum(draft.cogs);
  const effectiveSpend = draft.spendOverride ? parseNum(draft.spend) : adsetSpendSum;
  const cpaValue = cpa(effectiveSpend, orders);
  const roasValue = roas(revenue, effectiveSpend);
  const profitValue = profit(revenue, effectiveSpend, cogs);

  const isToday = date === today;
  const spendDisplay = draft.spendOverride ? draft.spend : (adsetSpendSum ? String(adsetSpendSum) : '');

  return (
    <TableRow className={cn(isToday && 'bg-elevated/40')}>
      <TableCell className="text-mono text-text">
        <DateInput
          value={pendingDate}
          today={today}
          onChange={setPendingDate}
          onBlur={handleDateBlur}
        />
      </TableCell>

      <TableCell className="text-right">
        <div className="inline-flex items-center justify-end gap-1.5">
          <SpendBadge
            override={draft.spendOverride}
            adsetSum={adsetSpendSum}
            onReset={handleResetSpend}
          />
          <Input
            ref={grid.getRef(row, 0)}
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            value={spendDisplay}
            placeholder="0"
            onChange={(e) => handleChange('spend', e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleEsc();
              grid.onKeyDown(row, 0)(e);
            }}
            aria-label={`Spend on ${date}`}
            className={cn(
              'h-8 w-24 px-2 text-right text-mono',
              !draft.spendOverride && 'text-text-muted',
            )}
          />
        </div>
      </TableCell>

      {(['revenue', 'orders', 'cogs'] as const).map((field, i) => (
        <TableCell key={field} className="text-right">
          <Input
            ref={grid.getRef(row, i + 1)}
            type="number"
            inputMode={field === 'orders' ? 'numeric' : 'decimal'}
            step={field === 'orders' ? '1' : '0.01'}
            min={0}
            value={draft[field]}
            placeholder="0"
            onChange={(e) => handleChange(field, e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleEsc();
              grid.onKeyDown(row, i + 1)(e);
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
          effectiveSpend > 0 ? TONE_TEXT_CLASS[roasTone(roasValue)] : 'text-text-muted',
        )}
      >
        {effectiveSpend > 0 ? roasValue.toFixed(2) : '—'}
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
  grid: ReturnType<typeof useGridNavigation>;
  usedDates: Set<string>;
  onSaveEntry: (date: string, values: CampaignEntryInput) => Promise<void>;
  onClearOverride: (date: string) => Promise<void>;
  onDeleteEntry: (date: string) => Promise<void>;
  onDeleteRequest: () => void;
}

function SavedEntryRow({
  row,
  today,
  entry,
  targetCPA,
  grid,
  usedDates,
  onSaveEntry,
  onClearOverride,
  onDeleteEntry,
  onDeleteRequest,
}: SavedEntryRowProps) {
  const [draft, setDraft] = useState<RowDraft>(() => toDraft(entry));
  const initialRef = useRef<RowDraft>(draft);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingDate, setPendingDate] = useState<string>(entry.date);

  useEffect(() => {
    const next = toDraft(entry);
    initialRef.current = next;
    setDraft((prev) => ({ ...next, ...dirtyFieldsOnly(prev, initialRef.current) }));
    setPendingDate(entry.date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    entry.spend,
    entry.revenue,
    entry.orders,
    entry.cogs,
    entry.spendOverride,
    entry.displayedSpend,
    entry.date,
  ]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    },
    [],
  );

  const flushSave = async (next: RowDraft) => {
    setStatus('saving');
    try {
      const spend = next.spendOverride ? parseNum(next.spend) : entry.adsetSpendSum;
      await onSaveEntry(entry.date, {
        spend,
        revenue: parseNum(next.revenue),
        orders: Math.round(parseNum(next.orders)),
        cogs: parseNum(next.cogs),
        spendOverride: next.spendOverride,
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
    const next = { ...draft, [field]: raw };
    if (field === 'spend') next.spendOverride = true;
    setDraft(next);
    scheduleSave(next);
  };

  const handleBlur = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    void flushSave(draft);
  };

  const handleEsc = () => {
    setDraft(initialRef.current);
  };

  const handleResetSpend = async () => {
    setStatus('saving');
    try {
      await onClearOverride(entry.date);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  };

  // "Move" the entry to a new date: write at new date, delete the old.
  const handleDateBlur = async () => {
    if (pendingDate === entry.date) return;
    const taken = usedDates.has(pendingDate) && pendingDate !== entry.date;
    if (!isValidDate(pendingDate) || taken) {
      setPendingDate(entry.date);
      return;
    }
    setStatus('saving');
    try {
      const spend = draft.spendOverride ? parseNum(draft.spend) : entry.adsetSpendSum;
      await onSaveEntry(pendingDate, {
        spend,
        revenue: parseNum(draft.revenue),
        orders: Math.round(parseNum(draft.orders)),
        cogs: parseNum(draft.cogs),
        spendOverride: draft.spendOverride,
      });
      await onDeleteEntry(entry.date);
      setStatus('saved');
    } catch {
      setStatus('error');
      setPendingDate(entry.date);
    }
  };

  const effectiveSpend = draft.spendOverride
    ? parseNum(draft.spend)
    : entry.adsetSpendSum;
  const orders = parseNum(draft.orders);
  const revenue = parseNum(draft.revenue);
  const cogs = parseNum(draft.cogs);
  const cpaValue = cpa(effectiveSpend, orders);
  const roasValue = roas(revenue, effectiveSpend);
  const profitValue = profit(revenue, effectiveSpend, cogs);

  const isToday = entry.date === today;

  return (
    <TableRow className={cn(isToday && 'bg-elevated/40')}>
      <TableCell className="text-mono text-text">
        <DateInput
          value={pendingDate}
          today={today}
          onChange={setPendingDate}
          onBlur={handleDateBlur}
        />
      </TableCell>

      <TableCell className="text-right">
        <div className="inline-flex items-center justify-end gap-1.5">
          <SpendBadge
            override={draft.spendOverride}
            adsetSum={entry.adsetSpendSum}
            onReset={handleResetSpend}
          />
          <Input
            ref={grid.getRef(row, 0)}
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            value={draft.spend}
            placeholder="0"
            onChange={(e) => handleChange('spend', e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleEsc();
              grid.onKeyDown(row, 0)(e);
            }}
            aria-label={`Spend on ${entry.date}`}
            className={cn(
              'h-8 w-24 px-2 text-right text-mono',
              !draft.spendOverride && 'text-text-muted',
            )}
          />
        </div>
      </TableCell>

      {(['revenue', 'orders', 'cogs'] as const).map((field, i) => (
        <TableCell key={field} className="text-right">
          <Input
            ref={grid.getRef(row, i + 1)}
            type="number"
            inputMode={field === 'orders' ? 'numeric' : 'decimal'}
            step={field === 'orders' ? '1' : '0.01'}
            min={0}
            value={draft[field]}
            placeholder="0"
            onChange={(e) => handleChange(field, e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleEsc();
              grid.onKeyDown(row, i + 1)(e);
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
          effectiveSpend > 0 ? TONE_TEXT_CLASS[roasTone(roasValue)] : 'text-text-muted',
        )}
      >
        {effectiveSpend > 0 ? roasValue.toFixed(2) : '—'}
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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Delete entry for ${entry.date}`}
          onClick={onDeleteRequest}
        >
          <Trash2 className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function DateInput({
  value,
  today,
  onChange,
  onBlur,
}: {
  value: string;
  today: string;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <Input
        type="date"
        value={value}
        max={today}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="h-8 w-36 px-2 text-mono"
      />
      {value === today && (
        <span className="rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-caption text-primary">
          today
        </span>
      )}
    </div>
  );
}

function SpendBadge({
  override,
  adsetSum,
  onReset,
}: {
  override: boolean;
  adsetSum: number;
  onReset: () => Promise<void> | void;
}) {
  if (override) {
    return (
      <span className="inline-flex items-center gap-1">
        <span
          title={`Manual override. Auto-fill total: ${formatCurrency(adsetSum)}`}
          className="inline-flex items-center gap-1 rounded-full border border-warning-border/50 bg-warning-bg/10 px-1.5 py-0.5 text-caption text-warning-text"
        >
          <Pencil className="size-3" />
          manual
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Reset spend to auto-fill"
          title="Reset to auto-fill"
          onClick={onReset}
          className="size-6 text-text-muted hover:text-text"
        >
          <RotateCcw className="size-3.5" />
        </Button>
      </span>
    );
  }

  return (
    <span
      title={`Auto-summed from adsets (${formatCurrency(adsetSum)})`}
      className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-elevated px-1.5 py-0.5 text-caption text-text-muted"
    >
      <Sigma className="size-3" />
      auto
    </span>
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
  if (current.spendOverride !== initial.spendOverride) out.spendOverride = current.spendOverride;
  return out;
}

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
