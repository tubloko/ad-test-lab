'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Check, AlertTriangle, Sigma, Pencil, RotateCcw, Trash2 } from 'lucide-react';
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
import { formatDate } from '@/lib/utils/formatDate';
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
import { cn } from '@/lib/utils';
import type { EnrichedCampaignEntry } from '@/hooks/useCampaignEntries';
import type { CampaignEntryInput } from '@/types/entry';

interface CampaignEntriesTableProps {
  entries: EnrichedCampaignEntry[];
  targetCPA: number;
  defaultCOGS?: number;
  timezone: string;
  onSaveEntry: (date: string, values: CampaignEntryInput) => Promise<void>;
  onClearOverride: (date: string) => Promise<void>;
  onDeleteEntry: (date: string) => Promise<void>;
}

// Editable column order — matches the grid-nav col indices.
const EDITABLE_COLS = ['spend', 'revenue', 'orders', 'cogs'] as const;
type EditableField = (typeof EDITABLE_COLS)[number];

interface RowDraft {
  spend: string;
  revenue: string;
  orders: string;
  cogs: string;
  spendOverride: boolean;
}

function toDraft(entry: EnrichedCampaignEntry, defaultCOGS?: number): RowDraft {
  const cogs = entry.cogs > 0 ? entry.cogs : defaultCOGS ?? 0;
  return {
    spend: entry.spendOverride ? String(entry.spend) : String(entry.displayedSpend),
    revenue: entry.revenue ? String(entry.revenue) : '',
    orders: entry.orders ? String(entry.orders) : '',
    cogs: cogs ? String(cogs) : '',
    spendOverride: entry.spendOverride,
  };
}

function emptyDraft(displayedSpend: number, defaultCOGS?: number): RowDraft {
  return {
    spend: displayedSpend ? String(displayedSpend) : '',
    revenue: '',
    orders: '',
    cogs: defaultCOGS ? String(defaultCOGS) : '',
    spendOverride: false,
  };
}

export function CampaignEntriesTable({
  entries,
  targetCPA,
  defaultCOGS,
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

  const todayEntry = useMemo(
    () => entries.find((e) => e.date === today) ?? null,
    [entries, today],
  );
  const pastEntries = useMemo(() => filtered.filter((e) => e.date !== today), [filtered, today]);

  // Grid nav: row 0 = today, then past entries DESC.
  const totalRows = 1 + pastEntries.length;
  const grid = useGridNavigation({
    rowCount: totalRows,
    colCount: EDITABLE_COLS.length,
  });

  const totals = useMemo(() => {
    const acc = filtered.reduce(
      (a, e) => ({
        spend: a.spend + e.effectiveSpend,
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
            <CampaignEntryRow
              key={`today-${todayEntry?.date ?? today}`}
              row={0}
              date={today}
              isToday
              entry={todayEntry}
              defaultCOGS={defaultCOGS}
              targetCPA={targetCPA}
              grid={grid}
              onSaveEntry={onSaveEntry}
              onClearOverride={onClearOverride}
              onDeleteRequest={() => setPendingDelete(today)}
            />
            {pastEntries.map((entry, idx) => (
              <CampaignEntryRow
                key={entry.date}
                row={idx + 1}
                date={entry.date}
                entry={entry}
                defaultCOGS={defaultCOGS}
                targetCPA={targetCPA}
                grid={grid}
                onSaveEntry={onSaveEntry}
                onClearOverride={onClearOverride}
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

interface CampaignEntryRowProps {
  row: number;
  date: string;
  isToday?: boolean;
  entry: EnrichedCampaignEntry | null;
  defaultCOGS?: number;
  targetCPA: number;
  grid: ReturnType<typeof useGridNavigation>;
  onSaveEntry: (date: string, values: CampaignEntryInput) => Promise<void>;
  onClearOverride: (date: string) => Promise<void>;
  onDeleteRequest: () => void;
}

function CampaignEntryRow({
  row,
  date,
  isToday,
  entry,
  defaultCOGS,
  targetCPA,
  grid,
  onSaveEntry,
  onClearOverride,
  onDeleteRequest,
}: CampaignEntryRowProps) {
  const [draft, setDraft] = useState<RowDraft>(() =>
    entry ? toDraft(entry, defaultCOGS) : emptyDraft(0, defaultCOGS),
  );
  const initialRef = useRef<RowDraft>(draft);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync draft when underlying entry changes (e.g., adset spend updates the
  // displayed spend, or another tab edited revenue) — but only for fields
  // the user is not currently editing.
  useEffect(() => {
    if (!entry) return;
    const next = toDraft(entry, defaultCOGS);
    initialRef.current = next;
    setDraft((prev) => ({
      ...next,
      // preserve user's in-progress edits if the field is dirty vs initial
      ...dirtyFieldsOnly(prev, initialRef.current),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    entry?.spend,
    entry?.revenue,
    entry?.orders,
    entry?.cogs,
    entry?.spendOverride,
    entry?.displayedSpend,
  ]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, []);

  const flushSave = async (next: RowDraft, options: { overrideSpend: boolean }) => {
    setStatus('saving');
    try {
      await onSaveEntry(date, {
        spend: parseNum(next.spend),
        revenue: parseNum(next.revenue),
        orders: Math.round(parseNum(next.orders)),
        cogs: parseNum(next.cogs),
        spendOverride: options.overrideSpend ? true : undefined,
      });
      setStatus('saved');
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(() => setStatus('idle'), 1200);
    } catch {
      setStatus('error');
    }
  };

  const scheduleSave = (next: RowDraft, options: { overrideSpend: boolean }) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void flushSave(next, options), 300);
  };

  const handleChange = (field: EditableField, raw: string) => {
    const next = { ...draft, [field]: raw };
    if (field === 'spend') next.spendOverride = true;
    setDraft(next);
    scheduleSave(next, { overrideSpend: field === 'spend' });
  };

  const handleBlur = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    void flushSave(draft, { overrideSpend: draft.spendOverride });
  };

  const handleEsc = () => {
    setDraft(initialRef.current);
  };

  const handleResetSpend = async () => {
    setStatus('saving');
    try {
      await onClearOverride(date);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  };

  // Compute display metrics from the *resolved* numbers (effective spend
  // when override is off, draft spend when on).
  const effectiveSpend = draft.spendOverride ? parseNum(draft.spend) : entry?.adsetSpendSum ?? 0;
  const orders = parseNum(draft.orders);
  const revenue = parseNum(draft.revenue);
  const cogs = parseNum(draft.cogs);
  const cpaValue = cpa(effectiveSpend, orders);
  const roasValue = roas(revenue, effectiveSpend);
  const profitValue = profit(revenue, effectiveSpend, cogs);

  const adsetSum = entry?.adsetSpendSum ?? 0;

  return (
    <TableRow className={cn(isToday && 'bg-elevated/40')}>
      <TableCell className="text-mono text-text">
        {isToday ? (
          <span className="inline-flex items-center gap-1.5">
            {formatDate(date)}
            <span className="rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-caption text-primary">
              today
            </span>
          </span>
        ) : (
          formatDate(date)
        )}
      </TableCell>

      {/* Spend cell — special: shows auto/manual indicator and a reset button */}
      <TableCell className="text-right">
        <div className="inline-flex items-center justify-end gap-1.5">
          <SpendBadge
            override={draft.spendOverride}
            adsetSum={adsetSum}
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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Delete entry for ${date}`}
          onClick={onDeleteRequest}
        >
          <Trash2 className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
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
  for (const k of EDITABLE_COLS) {
    if (current[k] !== initial[k]) out[k] = current[k];
  }
  if (current.spendOverride !== initial.spendOverride) out.spendOverride = current.spendOverride;
  return out;
}
