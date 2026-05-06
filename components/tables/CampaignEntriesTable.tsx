'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2,
  Check,
  AlertTriangle,
  Trash2,
  Sigma,
} from 'lucide-react';
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
import { cpa, roas } from '@/lib/metrics';
import { computeProfitWithFees } from '@/lib/metrics/profitWithFees';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate } from '@/lib/utils/formatDate';
import {
  cpaTone,
  roasTone,
  profitTone,
  TONE_TEXT_CLASS,
} from '@/lib/utils/threshold-color';
import { isWithinRange } from '@/lib/utils/dateRange';
import { cn } from '@/lib/utils';
import type { EnrichedCampaignEntry } from '@/hooks/useCampaignEntries';
import type { CampaignEntryInput } from '@/types/entry';
import type { ProductFees } from '@/types/product';
import type { EntriesTableController } from '@/hooks/useEntriesTableController';

interface CampaignEntriesTableProps {
  entries: EnrichedCampaignEntry[];
  /** Per-date sum of adset spend — drives the (read-only) Spend column. */
  adsetSpendByDate: Map<string, number>;
  targetCPA: number;
  today: string;
  /** Inclusive lower bound (YYYY-MM-DD) for which historical rows show. `null` = no lower bound. */
  fromDate: string | null;
  productFees?: ProductFees;
  controller: EntriesTableController;
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

export function CampaignEntriesTable({
  entries,
  adsetSpendByDate,
  targetCPA,
  today,
  fromDate,
  productFees,
  controller,
  onSaveEntry,
  onDeleteEntry,
}: CampaignEntriesTableProps) {
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

  // DESC: today first, then yesterday, then older. A row never reorders
  // when an extra promotes to a saved entry because the date drives sort.
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
      b.date.localeCompare(a.date),
    );
  }, [extras, filtered]);

  // First row by DESC sort is the today/most-recent row.
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

  // Single component for both unsaved and saved rows, keyed by date.
  // Splitting them caused the input to remount on the first save (different
  // component types behind the extras→saved transition swap), which is
  // what made focus jump after the first character.
  const renderRow = (r: Row, idx: number) => {
    const isExtra = r.kind === 'extra';
    // Auto-derived rows (today, adset-only) re-appear after a local
    // removal — hide the trash so users don't think it's doing nothing.
    // User-backfilled rows have UUID tempIds.
    const removable =
      isExtra &&
      !r.tempId.startsWith('today-') &&
      !r.tempId.startsWith('auto-');
    const adsetSpendSum =
      r.kind === 'saved' ? r.entry.adsetSpendSum : adsetSpendByDate.get(r.date) ?? 0;
    return (
      <EntryRow
        key={r.date}
        row={idx}
        today={today}
        date={r.date}
        entry={r.kind === 'saved' ? r.entry : undefined}
        adsetSpendSum={adsetSpendSum}
        targetCPA={targetCPA}
        productFees={productFees}
        grid={grid}
        onSaveEntry={onSaveEntry}
        onDeleteRequest={() => setPendingDelete(r.date)}
        onRemoveExtra={isExtra && removable ? () => removeExtra(r.tempId) : undefined}
      />
    );
  };

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <CollapsibleEntriesTable
          expanded={expanded}
          header={
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
          }
          todayRow={todayRowSpec ? renderRow(todayRowSpec, 0) : null}
          historicalRows={historicalRowSpecs.map((r, i) => renderRow(r, i + 1))}
        />
      </div>

      {!hasHistorical && (
        <p className="text-caption text-text-subtle">
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

interface EntryRowProps {
  row: number;
  today: string;
  date: string;
  /** Saved Firestore entry for this date. Undefined while still a local draft. */
  entry: EnrichedCampaignEntry | undefined;
  /** Used for the auto-fill spend display when the row hasn't been saved yet. */
  adsetSpendSum: number;
  targetCPA: number;
  productFees?: ProductFees;
  grid: ReturnType<typeof useGridNavigation>;
  onSaveEntry: (date: string, values: CampaignEntryInput) => Promise<void>;
  onDeleteRequest: () => void;
  /** Provided only when this row started life as a removable extra. */
  onRemoveExtra?: () => void;
}

function EntryRow({
  row,
  today,
  date,
  entry,
  adsetSpendSum,
  targetCPA,
  productFees,
  grid,
  onSaveEntry,
  onDeleteRequest,
  onRemoveExtra,
}: EntryRowProps) {
  const [draft, setDraft] = useState<RowDraft>(() => (entry ? toDraft(entry) : EMPTY_DRAFT));
  const initialRef = useRef<RowDraft>(draft);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external entry changes — including the first appearance after
  // a save promotes this row from extra to saved — without clobbering
  // the user's in-flight typing. dirtyFieldsOnly compares against the
  // PREVIOUS baseline (the last reconciled snapshot, or the empty draft
  // on first appearance) so that:
  //   - on first mount with entry already saved → prev matches old
  //     baseline, dirty is {}, draft adopts entry in full
  //   - on extras→saved transition where the user typed → user's changes
  //     are preserved over the saved values
  //   - on subsequent saved→saved updates → only fields the user touched
  //     since the last sync stay dirty
  useEffect(() => {
    if (!entry) return;
    const next = toDraft(entry);
    const previousInitial = initialRef.current;
    initialRef.current = next;
    setDraft((prev) => ({ ...next, ...dirtyFieldsOnly(prev, previousInitial) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.spend, entry?.revenue, entry?.orders, entry?.cogs, entry?.date]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    },
    [],
  );

  const effectiveAdsetSpendSum = entry ? entry.adsetSpendSum : adsetSpendSum;
  const adsetWins = effectiveAdsetSpendSum > 0;

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
  const spend = adsetWins ? effectiveAdsetSpendSum : parseNum(draft.spend);
  const cpaValue = cpa(spend, orders);
  const roasValue = roas(revenue, spend);
  const profitValue = rowProfit(revenue, spend, cogs, orders, productFees);

  const isToday = date === today;
  const isUntouched =
    draft.spend === '' &&
    draft.revenue === '' &&
    draft.orders === '' &&
    draft.cogs === '';

  // Saved → delete button. Unsaved-and-removable → remove button.
  // Today (saved or unsaved) and auto-derived extras → no action button.
  let actionsCell: React.ReactNode = null;
  if (entry && !isToday) {
    actionsCell = (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Delete entry for ${date}`}
        onClick={onDeleteRequest}
      >
        <Trash2 className="size-4" />
      </Button>
    );
  } else if (!entry && onRemoveExtra) {
    actionsCell = (
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
    );
  }

  return (
    <TableRow className={cn(isToday && 'bg-elevated/40')}>
      <TableCell className="text-mono text-text">
        <DateCell
          date={date}
          today={today}
          showDraftPill={!entry && !isToday && isUntouched}
        />
      </TableCell>

      {EDITABLE_COLS.map((field, i) => (
        <TableCell key={field} className="text-right">
          <SpendOrInput
            field={field}
            adsetWins={adsetWins}
            adsetSpendSum={effectiveAdsetSpendSum}
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
