'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Check, AlertTriangle, Trash2 } from 'lucide-react';
import {
  TableCell,
  TableHead,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { BackfillDialog } from '@/components/forms/BackfillDialog';
import { CollapsibleEntriesTable } from '@/components/tables/CollapsibleEntriesTable';
import { useGridNavigation } from '@/hooks/useGridNavigation';
import { lpvRate, atcRate, icFromLPV, convFromLPV } from '@/lib/metrics';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatPercent } from '@/lib/utils/formatPercent';
import { formatDate } from '@/lib/utils/formatDate';
import {
  rateTone,
  cpcTone,
  ctrTone,
  HEALTHY_LPV_RATE,
  HEALTHY_ATC_RATE,
  HEALTHY_IC_FROM_LPV,
  HEALTHY_CONV_FROM_LPV,
  TONE_TEXT_CLASS,
} from '@/lib/utils/threshold-color';
import { isWithinRange } from '@/lib/utils/dateRange';
import { cn } from '@/lib/utils';
import type { AdsetEntry, AdsetEntryInput } from '@/types/entry';
import type { EntriesTableController } from '@/hooks/useEntriesTableController';

interface AdsetEntriesTableProps {
  entries: AdsetEntry[];
  /** Inclusive lower bound (YYYY-MM-DD) for which historical rows show. `null` = no lower bound. */
  fromDate: string | null;
  today: string;
  controller: EntriesTableController;
  onSaveEntry: (date: string, values: AdsetEntryInput) => Promise<void>;
  onDeleteEntry: (date: string) => Promise<void>;
}

const EDITABLE_COLS = [
  'spend',
  'ctr',
  'clicks',
  'lpv',
  'atc',
  'ic',
  'purchases',
] as const;
type EditableField = (typeof EDITABLE_COLS)[number];

interface RowDraft {
  spend: string;
  clicks: string;
  lpv: string;
  atc: string;
  ic: string;
  purchases: string;
  ctr: string;
}

function toDraft(entry: AdsetEntry): RowDraft {
  return {
    spend: entry.spend ? String(entry.spend) : '',
    clicks: entry.clicks ? String(entry.clicks) : '',
    lpv: entry.lpv ? String(entry.lpv) : '',
    atc: entry.atc ? String(entry.atc) : '',
    ic: entry.ic ? String(entry.ic) : '',
    purchases: entry.purchases ? String(entry.purchases) : '',
    ctr: entry.ctr ? String(entry.ctr) : '',
  };
}

const EMPTY_DRAFT: RowDraft = {
  spend: '',
  clicks: '',
  lpv: '',
  atc: '',
  ic: '',
  purchases: '',
  ctr: '',
};

export function AdsetEntriesTable({
  entries,
  fromDate,
  today,
  controller,
  onSaveEntry,
  onDeleteEntry,
}: AdsetEntriesTableProps) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const {
    extras,
    expanded,
    pendingFocusDate,
    clearPendingFocus,
    removeExtra,
    backfillOpen,
    setBackfillOpen,
    handleBackfill,
  } = controller;

  const filtered = useMemo(
    () => entries.filter((e) => isWithinRange(e.date, fromDate, today)),
    [entries, fromDate, today],
  );

  // DESC: today first, then historical descending. Keeps row identity
  // stable through the extra → saved transition.
  type Row =
    | { kind: 'extra'; date: string; tempId: string }
    | { kind: 'saved'; date: string; entry: AdsetEntry };
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
      b.date.localeCompare(a.date),
    );
  }, [extras, filtered]);

  const todayRowSpec = allRows[0] ?? null;
  const historicalRowSpecs = allRows.slice(1);

  const visibleCount = expanded ? allRows.length : 1;
  const grid = useGridNavigation({
    rowCount: visibleCount,
    colCount: EDITABLE_COLS.length,
  });

  useEffect(() => {
    if (!pendingFocusDate) return;
    const idx = allRows.findIndex((r) => r.date === pendingFocusDate);
    if (idx >= 0 && (expanded || idx === 0)) {
      grid.focusCell(idx, 0);
      clearPendingFocus();
    }
  }, [pendingFocusDate, allRows, grid, expanded, clearPendingFocus]);

  const hasHistorical = historicalRowSpecs.length > 0;

  const renderRow = (r: Row, idx: number) => {
    if (r.kind === 'extra') {
      return (
        <ExtraRowComponent
          key={r.tempId}
          row={idx}
          today={today}
          date={r.date}
          grid={grid}
          onSaveEntry={onSaveEntry}
          onRemoveExtra={() => removeExtra(r.tempId)}
        />
      );
    }
    return (
      <SavedEntryRow
        key={r.date}
        row={idx}
        today={today}
        entry={r.entry}
        grid={grid}
        onSaveEntry={onSaveEntry}
        onDeleteRequest={() => setPendingDelete(r.date)}
      />
    );
  };

  return (
    <div className="space-y-2">
      <CollapsibleEntriesTable
        expanded={expanded}
        header={
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Spend</TableHead>
            <TableHead className="text-right">CTR%</TableHead>
            <TableHead className="text-right">Clicks</TableHead>
            <TableHead className="text-right">LPV</TableHead>
            <TableHead className="text-right">ATC</TableHead>
            <TableHead className="text-right">IC</TableHead>
            <TableHead className="text-right">Purchases</TableHead>
            <TableHead className="text-right">CPC</TableHead>
            <TableHead className="text-right">LPV%</TableHead>
            <TableHead className="text-right">ATC%</TableHead>
            <TableHead className="text-right">IC%</TableHead>
            <TableHead className="text-right">Conv%</TableHead>
            <TableHead className="w-8" />
            <TableHead className="w-10" />
          </TableRow>
        }
        todayRow={todayRowSpec ? renderRow(todayRowSpec, 0) : null}
        historicalRows={historicalRowSpecs.map((r, i) => renderRow(r, i + 1))}
      />

      {!hasHistorical && (
        <p className="px-3 pb-2 text-caption text-text-muted">
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
  // Always include every field — including optional ones at 0 — so that
  // clearing a cell actually overwrites the previous stored value. With
  // setDoc({ merge: true }), an omitted field would be preserved, which
  // makes "type then clear" leave stale data behind.
  return {
    spend: parseNum(next.spend),
    clicks: Math.round(parseNum(next.clicks)),
    lpv: Math.round(parseNum(next.lpv)),
    atc: Math.round(parseNum(next.atc)),
    ic: Math.round(parseNum(next.ic)),
    purchases: Math.round(parseNum(next.purchases)),
    ctr: parseNum(next.ctr),
  };
}

function ExtraRowComponent({
  row,
  today,
  date,
  grid,
  onSaveEntry,
  onRemoveExtra,
}: {
  row: number;
  today: string;
  date: string;
  grid: ReturnType<typeof useGridNavigation>;
  onSaveEntry: (date: string, values: AdsetEntryInput) => Promise<void>;
  onRemoveExtra: () => void;
}) {
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
      date={date}
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
  onSaveEntry,
  onDeleteRequest,
}: {
  row: number;
  today: string;
  entry: AdsetEntry;
  grid: ReturnType<typeof useGridNavigation>;
  onSaveEntry: (date: string, values: AdsetEntryInput) => Promise<void>;
  onDeleteRequest: () => void;
}) {
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

  const isToday = entry.date === today;

  return (
    <Row
      isToday={isToday}
      today={today}
      date={entry.date}
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
  date,
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
  date: string;
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
  const icR = icFromLPV(ic, lpv);
  const convR = convFromLPV(purchases, lpv);

  return (
    <TableRow className={cn(isToday && 'bg-elevated/40')}>
      <TableCell className="text-mono text-text">
        <DateCell date={date} today={today} showDraftPill={showDraftPill} />
      </TableCell>

      {EDITABLE_COLS.map((field, i) => {
        const isDecimal = field === 'spend' || field === 'ctr';
        const isCtr = field === 'ctr';
        const ctrValue = parseNum(draft.ctr);
        return (
          <TableCell key={field} className="text-right">
            <Input
              ref={grid.getRef(row, i)}
              type="number"
              inputMode={isDecimal ? 'decimal' : 'numeric'}
              step={isDecimal ? '0.01' : '1'}
              min={0}
              max={isCtr ? 100 : undefined}
              value={draft[field]}
              placeholder="0"
              onChange={(e) => onChange(field, e.target.value)}
              onBlur={onBlur}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onEsc();
                grid.onKeyDown(row, i)(e);
              }}
              aria-label={`${field} on ${ariaDate}`}
              className={cn(
                'h-8 w-24 px-2 text-right text-mono',
                isCtr && ctrValue > 0 && TONE_TEXT_CLASS[ctrTone(ctrValue)],
              )}
            />
          </TableCell>
        );
      })}

      <TableCell
        className={cn(
          'text-right text-mono',
          clicks > 0 ? TONE_TEXT_CLASS[cpcTone(cpc)] : 'text-text-muted',
        )}
      >
        {clicks > 0 ? formatCurrency(cpc) : '—'}
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
          lpv > 0 ? TONE_TEXT_CLASS[rateTone(icR, HEALTHY_IC_FROM_LPV)] : 'text-text-muted',
        )}
      >
        {lpv > 0 ? formatPercent(icR) : '—'}
      </TableCell>
      <TableCell
        className={cn(
          'text-right text-mono',
          lpv > 0 ? TONE_TEXT_CLASS[rateTone(convR, HEALTHY_CONV_FROM_LPV)] : 'text-text-muted',
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
