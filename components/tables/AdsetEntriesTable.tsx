'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Check, AlertTriangle, Trash2 } from 'lucide-react';
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
import { lpvRate, atcRate, icRate } from '@/lib/metrics';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatPercent } from '@/lib/utils/formatPercent';
import { formatDate } from '@/lib/utils/formatDate';
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
import { cn } from '@/lib/utils';
import type { AdsetEntry, AdsetEntryInput } from '@/types/entry';

interface AdsetEntriesTableProps {
  entries: AdsetEntry[];
  timezone: string;
  onSaveEntry: (date: string, values: AdsetEntryInput) => Promise<void>;
  onDeleteEntry: (date: string) => Promise<void>;
}

const EDITABLE_COLS = ['spend', 'clicks', 'lpv', 'atc', 'ic'] as const;
type EditableField = (typeof EDITABLE_COLS)[number];

interface RowDraft {
  spend: string;
  clicks: string;
  lpv: string;
  atc: string;
  ic: string;
}

function toDraft(entry: AdsetEntry): RowDraft {
  return {
    spend: entry.spend ? String(entry.spend) : '',
    clicks: entry.clicks ? String(entry.clicks) : '',
    lpv: entry.lpv ? String(entry.lpv) : '',
    atc: entry.atc ? String(entry.atc) : '',
    ic: entry.ic ? String(entry.ic) : '',
  };
}

const EMPTY_DRAFT: RowDraft = { spend: '', clicks: '', lpv: '', atc: '', ic: '' };

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

  const todayEntry = useMemo(
    () => entries.find((e) => e.date === today) ?? null,
    [entries, today],
  );
  const pastEntries = useMemo(
    () => filtered.filter((e) => e.date !== today),
    [filtered, today],
  );

  const totalRows = 1 + pastEntries.length;
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
            <AdsetEntryRow
              key={`today-${todayEntry?.date ?? today}`}
              row={0}
              date={today}
              isToday
              entry={todayEntry}
              grid={grid}
              onSaveEntry={onSaveEntry}
              onDeleteRequest={() => setPendingDelete(today)}
            />
            {pastEntries.map((entry, idx) => (
              <AdsetEntryRow
                key={entry.date}
                row={idx + 1}
                date={entry.date}
                entry={entry}
                grid={grid}
                onSaveEntry={onSaveEntry}
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
                <TableCell className="text-right text-mono text-text">
                  {totals.clicks > 0 ? formatCurrency(totals.cpc) : '—'}
                </TableCell>
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
                <TableCell
                  className={cn(
                    'text-right text-mono',
                    TONE_TEXT_CLASS[rateTone(totals.icRate, HEALTHY_IC_RATE)],
                  )}
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

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function AdsetEntryRow({
  row,
  date,
  isToday,
  entry,
  grid,
  onSaveEntry,
  onDeleteRequest,
}: {
  row: number;
  date: string;
  isToday?: boolean;
  entry: AdsetEntry | null;
  grid: ReturnType<typeof useGridNavigation>;
  onSaveEntry: (date: string, values: AdsetEntryInput) => Promise<void>;
  onDeleteRequest: () => void;
}) {
  const [draft, setDraft] = useState<RowDraft>(() => (entry ? toDraft(entry) : EMPTY_DRAFT));
  const initialRef = useRef<RowDraft>(draft);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!entry) return;
    const next = toDraft(entry);
    initialRef.current = next;
    setDraft((prev) => ({ ...next, ...dirtyFieldsOnly(prev, initialRef.current) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.spend, entry?.clicks, entry?.lpv, entry?.atc, entry?.ic]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, []);

  const flushSave = async (next: RowDraft) => {
    setStatus('saving');
    try {
      await onSaveEntry(date, {
        spend: parseNum(next.spend),
        clicks: Math.round(parseNum(next.clicks)),
        lpv: Math.round(parseNum(next.lpv)),
        atc: Math.round(parseNum(next.atc)),
        ic: Math.round(parseNum(next.ic)),
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

  const spend = parseNum(draft.spend);
  const clicks = parseNum(draft.clicks);
  const lpv = parseNum(draft.lpv);
  const atc = parseNum(draft.atc);
  const ic = parseNum(draft.ic);

  const cpc = clicks > 0 ? spend / clicks : 0;
  const lpvR = lpvRate(lpv, clicks);
  const atcR = atcRate(atc, lpv);
  const icR = icRate(ic, atc);

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
            onChange={(e) => handleChange(field, e.target.value)}
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

      <TableCell className="text-right text-mono text-text">
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
          atc > 0 ? TONE_TEXT_CLASS[rateTone(icR, HEALTHY_IC_RATE)] : 'text-text-muted',
        )}
      >
        {atc > 0 ? formatPercent(icR) : '—'}
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
