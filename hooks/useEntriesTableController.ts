'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useExpandedTable } from '@/hooks/useExpandedTable';

export interface ExtraRow {
  tempId: string;
  date: string;
}

interface UseEntriesTableControllerArgs {
  /** Dates of saved entries (any date — filtering by range happens elsewhere). */
  entryDates: string[];
  /** YYYY-MM-DD in the user's timezone. */
  today: string;
  /**
   * Dates that should appear as auto-rows even without a saved entry
   * (campaign uses adset-spend-only dates). Auto-rows aren't user-removable.
   */
  autoIncludeDates?: string[];
  /** URL key for the expanded state. */
  storageKey: string;
}

export interface EntriesTableController {
  /** Local rows that don't yet have a saved entry. */
  extras: ExtraRow[];
  /** True if the most-recent oldest backfill date should grab focus. */
  pendingFocusDate: string | null;
  clearPendingFocus: () => void;
  removeExtra: (tempId: string) => void;
  /** Wired to BackfillDialog.onBackfill. Adds drafts, expands, toasts. */
  handleBackfill: (dates: string[]) => void;
  expanded: boolean;
  setExpanded: (next: boolean) => void;
  toggleExpanded: () => void;
  backfillOpen: boolean;
  setBackfillOpen: (open: boolean) => void;
  openBackfill: () => void;
}

/**
 * One controller for the daily-entries table state — extras (unsaved
 * draft rows), the backfill dialog, and the URL-driven expanded flag.
 *
 * Lives in the parent so the toggle and backfill buttons can be rendered
 * inline in the parent's header row. The table body component receives
 * this controller and renders `extras` alongside saved entries.
 */
export function useEntriesTableController({
  entryDates,
  today,
  autoIncludeDates,
  storageKey,
}: UseEntriesTableControllerArgs): EntriesTableController {
  const [extras, setExtras] = useState<ExtraRow[]>([
    { tempId: 'today-default', date: today },
  ]);
  const [pendingFocusDate, setPendingFocusDate] = useState<string | null>(null);
  const [backfillOpen, setBackfillOpen] = useState(false);
  const { expanded, setExpanded, toggle: toggleExpanded } =
    useExpandedTable(storageKey);

  const savedSet = useMemo(() => new Set(entryDates), [entryDates]);
  const autoSet = useMemo(
    () => new Set(autoIncludeDates ?? []),
    [autoIncludeDates],
  );

  useEffect(() => {
    setExtras((prev) => {
      let next = prev.filter((r) => !savedSet.has(r.date));
      if (!savedSet.has(today) && !next.some((r) => r.date === today)) {
        next = [{ tempId: `today-${today}`, date: today }, ...next];
      }
      for (const d of autoSet) {
        if (savedSet.has(d)) continue;
        if (next.some((r) => r.date === d)) continue;
        next.push({ tempId: `auto-${d}`, date: d });
      }
      const sameAsBefore =
        next.length === prev.length && next.every((r, i) => r === prev[i]);
      return sameAsBefore ? prev : next;
    });
  }, [savedSet, autoSet, today]);

  const removeExtra = useCallback((tempId: string) => {
    setExtras((prev) => prev.filter((x) => x.tempId !== tempId));
  }, []);

  const handleBackfill = useCallback(
    (dates: string[]) => {
      const existing = new Set([
        ...savedSet,
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
        setExpanded(true);
        return;
      }
      setExtras((prev) => [...prev, ...newRows]);
      if (oldestNew) setPendingFocusDate(oldestNew);
      setExpanded(true);
      if (skipped > 0) {
        toast.success(
          `Added ${newRows.length} rows. ${skipped} dates already existed.`,
        );
      } else {
        toast.success(`Added ${newRows.length} rows.`);
      }
    },
    [savedSet, extras, setExpanded],
  );

  const clearPendingFocus = useCallback(() => setPendingFocusDate(null), []);
  const openBackfill = useCallback(() => setBackfillOpen(true), []);

  return {
    extras,
    pendingFocusDate,
    clearPendingFocus,
    removeExtra,
    handleBackfill,
    expanded,
    setExpanded,
    toggleExpanded,
    backfillOpen,
    setBackfillOpen,
    openBackfill,
  };
}
