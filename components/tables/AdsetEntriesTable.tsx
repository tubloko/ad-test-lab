'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Check, AlertTriangle, Trash2, CalendarPlus } from 'lucide-react';
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
import { lpvRate, atcRate, icFromLPV, convFromLPV } from '@/lib/metrics';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatPercent } from '@/lib/utils/formatPercent';
import { formatDate } from '@/lib/utils/formatDate';
import { todayInTimezone, subtractDays } from '@/lib/utils/date';
import {
  rateTone,
  HEALTHY_LPV_RATE,
  HEALTHY_ATC_RATE,
  TONE_TEXT_CLASS,
} from '@/lib/utils/threshold-color';
import {
  rangeStartDate,
  isWithinRange,
  type DateRangePreset,
} from '@/lib/utils/dateRange';
import { cn } from '@/lib/utils';
import type { AdsetEntry, AdsetEntryInput } from '@/types/entry';

interface AdsetEntriesTableProps {
  entries: AdsetEntry[];
  timezone: string;
  onSaveEntry: (date: string, values: AdsetEntryInput) => Promise<void>;
  onDeleteEntry: (date: string) => Promise<void>;
}

const EDITABLE_COLS = ['spend', 'clicks', 'lpv', 'atc', 'ic', 'purchases'] as const;
type EditableField = (typeof EDITABLE_COLS)[number];

interface RowDraft {
  spend: string;
  clicks: string;
  lpv: string;
  atc: string;
  ic: string;
  purchases: string;
}

function toDraft(entry: AdsetEntry): RowDraft {
  return {
    spend: entry.spend ? String(entry.spend) : '',
    clicks: entry.clicks ? String(entry.clicks) : '',
    lpv: entry.lpv ? String(entry.lpv) : '',
    atc: entry.atc ? String(entry.atc) : '',
    ic: entry.ic ? String(entry.ic) : '',
    purchases: entry.purchases ? String(entry.purchases) : '',
  };
}

const EMPTY_DRAFT: RowDraft = {
  spend: '',
  clicks: '',
  lpv: '',
  atc: '',
  ic: '',
  purchases: '',
};

interface ExtraRow {
  tempId: string;
  date: string;
}

export function AdsetEntriesTable({
  entries,
  timezone,
  onSaveEntry,
  onDeleteEntry,
}: AdsetEntriesTableProps) {
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

  // Old → new (ascending). Today's row sits at the bottom.
  const sortedExtras = useMemo(
    () => [...extras].sort((a, b) => a.date.localeCompare(b.date)),
    [extras],
  );
  const sortedEntries = useMemo(
    () => [...filtered].sort((a, b) => a.date.localeCompare(b.date)),
    [filtered],
  );

  const totalRows = sortedExtras.length + sortedEntries.length;
  const grid = useGridNavigation({
    rowCount: totalRows,
    colCount: EDITABLE_COLS.length,
  });

  const totals = useMemo(() => {
    const acc = filtered.reduce(
      (a, e) => ({
        spend: a.spend + e.spend,
        clicks: a.clicks + e.clicks,
        lpv: a.lpv + e.lpv,
        atc: a.atc + e.atc,
        ic: a.ic + e.ic,
        purchases: a.purchases + (e.purchases ?? 0),
      }),
      { spend: 0, clicks: 0, lpv: 0, atc: 0, ic: 0, purchases: 0 },
    );
    return {
      ...acc,
      cpc: acc.clicks > 0 ? acc.spend / acc.clicks : 0,
      lpvRate: lpvRate(acc.lpv, acc.clicks),
      atcRate: atcRate(acc.atc, acc.lpv),
      icRate: icFromLPV(acc.ic, acc.lpv),
      purchaseRate: convFromLPV(acc.purchases, acc.lpv),
    };
  }, [filtered]);

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

  useEffect(() => {
    if (!pendingFocusDate) return;
    const eIdx = sortedExtras.findIndex((r) => r.date === pendingFocusDate);
    if (eIdx >= 0) {
      grid.focusCell(eIdx, 0);
      setPendingFocusDate(null);
      return;
    }
    const sIdx = sortedEntries.findIndex((e) => e.date === pendingFocusDate);
    if (sIdx >= 0) {
      grid.focusCell(sIdx + sortedExtras.length, 0);
      setPendingFocusDate(null);
    }
  }, [pendingFocusDate, sortedExtras, sortedEntries, grid]);

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
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead className="text-right">LPV</TableHead>
              <TableHead className="text-right">ATC</TableHead>
              <TableHead className="text-right">IC</TableHead>
              <TableHead className="text-right">Purchases</TableHead>
              <TableHead className="text-right">CPC</TableHead>
              <TableHead className="text-right">CTR%</TableHead>
              <TableHead className="text-right">LPV%</TableHead>
              <TableHead className="text-right">ATC%</TableHead>
              <TableHead className="text-right">IC%</TableHead>
              <TableHead className="text-right">Conv%</TableHead>
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
                grid={grid}
                usedDates={usedDates}
                onSaveEntry={onSaveEntry}
                onDeleteEntry={onDeleteEntry}
                onDeleteRequest={() => setPendingDelete(entry.date)}
              />
            ))}
          </TableBody>
          {filtered.length > 0 && (
            <TableFooter>
              <TableRow className="bg-elevated">
                <TableCell className="text-subheading text-text">Total</TableCell>
                <TableCell className="text-right text-mono text-text">
                  {formatCurrency(totals.spend)}
                </TableCell>
                <TableCell className="text-right text-mono text-text">{totals.clicks}</TableCell>
                <TableCell className="text-right text-mono text-text">{totals.lpv}</TableCell>
                <TableCell className="text-right text-mono text-text">{totals.atc}</TableCell>
                <TableCell className="text-right text-mono text-text">{totals.ic}</TableCell>
                <TableCell className="text-right text-mono text-text">{totals.purchases}</TableCell>
                <TableCell className="text-right text-mono text-text">
                  {totals.clicks > 0 ? formatCurrency(totals.cpc) : '—'}
                </TableCell>
                <TableCell className="text-right text-mono text-text-muted">—</TableCell>
                <TableCell
                  className={cn(
                    'text-right text-mono',
                    TONE_TEXT_CLASS[rateTone(totals.lpvRate, HEALTHY_LPV_RATE)],
                  )}
                >
                  {totals.clicks > 0 ? formatPercent(totals.lpvRate) : '—'}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right text-mono',
                    TONE_TEXT_CLASS[rateTone(totals.atcRate, HEALTHY_ATC_RATE)],
                  )}
                >
                  {totals.lpv > 0 ? formatPercent(totals.atcRate) : '—'}
                </TableCell>
                <TableCell className="text-right text-mono text-text">
                  {totals.lpv > 0 ? formatPercent(totals.icRate) : '—'}
                </TableCell>
                <TableCell className="text-right text-mono text-text">
                  {totals.lpv > 0 ? formatPercent(totals.purchaseRate) : '—'}
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

function buildPayload(next: RowDraft): AdsetEntryInput {
  const purchases = parseNum(next.purchases);
  return {
    spend: parseNum(next.spend),
    clicks: Math.round(parseNum(next.clicks)),
    lpv: Math.round(parseNum(next.lpv)),
    atc: Math.round(parseNum(next.atc)),
    ic: Math.round(parseNum(next.ic)),
    ...(purchases > 0 ? { purchases: Math.round(purchases) } : {}),
  };
}

function ExtraRowComponent({
  row,
  today,
  date,
  grid,
  usedDates,
  onSaveEntry,
  onDateChange,
  onRemoveExtra,
}: {
  row: number;
  today: string;
  date: string;
  grid: ReturnType<typeof useGridNavigation>;
  usedDates: Set<string>;
  onSaveEntry: (date: string, values: AdsetEntryInput) => Promise<void>;
  onDateChange: (date: string) => void;
  onRemoveExtra: () => void;
}) {
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
      await onSaveEntry(date, buildPayload(next));
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
    setDraft(next);
    scheduleSave(next);
  };

  const handleBlur = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    void flushSave(draft);
  };

  const handleEsc = () => setDraft(initialRef.current);

  const handleDateBlur = () => {
    if (pendingDate === date) return;
    if (!isValidDate(pendingDate) || (usedDates.has(pendingDate) && pendingDate !== date)) {
      setPendingDate(date);
      return;
    }
    onDateChange(pendingDate);
  };

  const isUntouched =
    draft.spend === '' &&
    draft.clicks === '' &&
    draft.lpv === '' &&
    draft.atc === '' &&
    draft.ic === '' &&
    draft.purchases === '';

  return (
    <Row
      isToday={date === today}
      today={today}
      pendingDate={pendingDate}
      setPendingDate={setPendingDate}
      onDateBlur={handleDateBlur}
      draft={draft}
      onChange={handleChange}
      onBlur={handleBlur}
      onEsc={handleEsc}
      grid={grid}
      row={row}
      status={status}
      showDraftPill={date !== today && isUntouched}
      actionsCell={
        date !== today && (
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
        )
      }
      ariaDate={date}
    />
  );
}

function SavedEntryRow({
  row,
  today,
  entry,
  grid,
  usedDates,
  onSaveEntry,
  onDeleteEntry,
  onDeleteRequest,
}: {
  row: number;
  today: string;
  entry: AdsetEntry;
  grid: ReturnType<typeof useGridNavigation>;
  usedDates: Set<string>;
  onSaveEntry: (date: string, values: AdsetEntryInput) => Promise<void>;
  onDeleteEntry: (date: string) => Promise<void>;
  onDeleteRequest: () => void;
}) {
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
    entry.clicks,
    entry.lpv,
    entry.atc,
    entry.ic,
    entry.purchases,
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
      await onSaveEntry(entry.date, buildPayload(next));
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
    setDraft(next);
    scheduleSave(next);
  };

  const handleBlur = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    void flushSave(draft);
  };

  const handleEsc = () => setDraft(initialRef.current);

  const handleDateBlur = async () => {
    if (pendingDate === entry.date) return;
    const taken = usedDates.has(pendingDate) && pendingDate !== entry.date;
    if (!isValidDate(pendingDate) || taken) {
      setPendingDate(entry.date);
      return;
    }
    setStatus('saving');
    try {
      await onSaveEntry(pendingDate, buildPayload(draft));
      await onDeleteEntry(entry.date);
      setStatus('saved');
    } catch {
      setStatus('error');
      setPendingDate(entry.date);
    }
  };

  const isToday = entry.date === today;

  return (
    <Row
      isToday={isToday}
      today={today}
      pendingDate={pendingDate}
      setPendingDate={setPendingDate}
      onDateBlur={handleDateBlur}
      draft={draft}
      onChange={handleChange}
      onBlur={handleBlur}
      onEsc={handleEsc}
      grid={grid}
      row={row}
      status={status}
      actionsCell={
        !isToday && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Delete entry for ${entry.date}`}
            onClick={onDeleteRequest}
          >
            <Trash2 className="size-4" />
          </Button>
        )
      }
      ariaDate={entry.date}
    />
  );
}

function Row({
  isToday,
  today,
  pendingDate,
  setPendingDate,
  onDateBlur,
  draft,
  onChange,
  onBlur,
  onEsc,
  grid,
  row,
  status,
  actionsCell,
  ariaDate,
  showDraftPill = false,
}: {
  isToday: boolean;
  today: string;
  pendingDate: string;
  setPendingDate: (v: string) => void;
  onDateBlur: () => void;
  draft: RowDraft;
  onChange: (field: EditableField, raw: string) => void;
  onBlur: () => void;
  onEsc: () => void;
  grid: ReturnType<typeof useGridNavigation>;
  row: number;
  status: SaveStatus;
  actionsCell: React.ReactNode;
  ariaDate: string;
  showDraftPill?: boolean;
}) {
  const spend = parseNum(draft.spend);
  const clicks = parseNum(draft.clicks);
  const lpv = parseNum(draft.lpv);
  const atc = parseNum(draft.atc);
  const ic = parseNum(draft.ic);
  const purchases = parseNum(draft.purchases);

  const cpc = clicks > 0 ? spend / clicks : 0;
  const lpvR = lpvRate(lpv, clicks);
  const atcR = atcRate(atc, lpv);
  // IC% and Conv% are now relative to landing-page views — same denominator
  // as ATC% — so the funnel stages compare against one consistent base.
  const icR = icFromLPV(ic, lpv);
  const convR = convFromLPV(purchases, lpv);

  return (
    <TableRow className={cn(isToday && 'bg-elevated/40')}>
      <TableCell className="text-mono text-text">
        <DateInput
          value={pendingDate}
          today={today}
          editable={!isToday}
          showDraftPill={showDraftPill}
          onChange={setPendingDate}
          onBlur={onDateBlur}
        />
      </TableCell>

      {EDITABLE_COLS.map((field, i) => (
        <TableCell key={field} className="text-right">
          <Input
            ref={grid.getRef(row, i)}
            type="number"
            inputMode={field === 'spend' ? 'decimal' : 'numeric'}
            step={field === 'spend' ? '0.01' : '1'}
            min={0}
            value={draft[field]}
            placeholder="0"
            onChange={(e) => onChange(field, e.target.value)}
            onBlur={onBlur}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onEsc();
              grid.onKeyDown(row, i)(e);
            }}
            aria-label={`${field} on ${ariaDate}`}
            className="h-8 w-24 px-2 text-right text-mono"
          />
        </TableCell>
      ))}

      <TableCell className="text-right text-mono text-text">
        {clicks > 0 ? formatCurrency(cpc) : '—'}
      </TableCell>
      <TableCell
        className="text-right text-mono text-text-muted"
        title="CTR needs impressions, which we don't track yet"
      >
        —
      </TableCell>
      <TableCell
        className={cn(
          'text-right text-mono',
          clicks > 0 ? TONE_TEXT_CLASS[rateTone(lpvR, HEALTHY_LPV_RATE)] : 'text-text-muted',
        )}
      >
        {clicks > 0 ? formatPercent(lpvR) : '—'}
      </TableCell>
      <TableCell
        className={cn(
          'text-right text-mono',
          lpv > 0 ? TONE_TEXT_CLASS[rateTone(atcR, HEALTHY_ATC_RATE)] : 'text-text-muted',
        )}
      >
        {lpv > 0 ? formatPercent(atcR) : '—'}
      </TableCell>
      <TableCell
        className={cn(
          'text-right text-mono',
          lpv > 0 ? 'text-text' : 'text-text-muted',
        )}
      >
        {lpv > 0 ? formatPercent(icR) : '—'}
      </TableCell>
      <TableCell
        className={cn(
          'text-right text-mono',
          lpv > 0 ? 'text-text' : 'text-text-muted',
        )}
      >
        {lpv > 0 ? formatPercent(convR) : '—'}
      </TableCell>

      <TableCell className="w-8 text-center">
        <SaveIndicator status={status} />
      </TableCell>

      <TableCell className="w-10 text-right">{actionsCell}</TableCell>
    </TableRow>
  );
}

function DateInput({
  value,
  today,
  editable = true,
  showDraftPill = false,
  onChange,
  onBlur,
}: {
  value: string;
  today: string;
  editable?: boolean;
  showDraftPill?: boolean;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      {editable ? (
        <Input
          type="date"
          value={value}
          max={subtractDays(today, 1)}
          min={subtractDays(today, 365)}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className="h-8 w-36 px-2 text-mono"
        />
      ) : (
        <span className="inline-flex h-8 items-center px-2 text-mono">
          {formatDate(value)}
        </span>
      )}
      {value === today && (
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

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
