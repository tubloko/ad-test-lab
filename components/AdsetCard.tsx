'use client';

import { useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusMenu } from './StatusMenu';
import { ConfirmDialog } from './ConfirmDialog';
import { AdsetHealthDot } from './AdsetHealthDot';
import { AdsetSummaryStrip } from './AdsetSummaryStrip';
import { DateRangeSelect } from './DateRangeSelect';
import { AdsetEntriesTable } from '@/components/tables/AdsetEntriesTable';
import { EntriesToggleButton } from '@/components/tables/EntriesToggleButton';
import { BackfillButton } from '@/components/tables/BackfillButton';
import { EditAdsetDialog } from '@/components/forms/EditAdsetDialog';
import { useAdsetEntries } from '@/hooks/useAdsetEntries';
import { useAdsetEntryMutations } from '@/hooks/useAdsetEntryMutations';
import { useEntriesTableController } from '@/hooks/useEntriesTableController';
import { cn } from '@/lib/utils';
import { computeAdsetTotals } from '@/lib/metrics/adsetTotals';
import { adsetHealth } from '@/lib/utils/adset-health';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { getBrowserTimezone, todayInTimezone } from '@/lib/utils/date';
import { rangeStartDate, type DateRangePreset, isWithinRange } from '@/lib/utils/dateRange';
import {
  ADSET_TRANSITIONS,
  type Adset,
  type AdsetInput,
  type AdsetStatus,
} from '@/types/adset';

interface AdsetCardListProps {
  productId: string;
  campaignId: string;
  productName: string;
  adsets: Adset[];
  onConfirmDelete: (adsetId: string) => Promise<void> | void;
  onEdit: (adsetId: string, data: AdsetInput) => Promise<void>;
  onStatusChange: (adsetId: string, status: AdsetStatus) => Promise<void>;
}

export function AdsetCardList({
  productId,
  campaignId,
  productName,
  adsets,
  onConfirmDelete,
  onEdit,
  onStatusChange,
}: AdsetCardListProps) {
  if (adsets.length === 0) return null;

  return (
    <div className="space-y-4">
      {adsets.map((adset) => (
        <AdsetCard
          key={adset.id}
          productId={productId}
          campaignId={campaignId}
          productName={productName}
          adset={adset}
          onDelete={onConfirmDelete}
          onEdit={onEdit}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  );
}

interface AdsetCardProps {
  productId: string;
  campaignId: string;
  productName: string;
  adset: Adset;
  onDelete: (adsetId: string) => Promise<void> | void;
  onEdit: (adsetId: string, data: AdsetInput) => Promise<void>;
  onStatusChange: (adsetId: string, status: AdsetStatus) => Promise<void>;
}

function AdsetCard({
  productId,
  campaignId,
  productName,
  adset,
  onDelete,
  onEdit,
  onStatusChange,
}: AdsetCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [pendingKill, setPendingKill] = useState<AdsetStatus | null>(null);
  const [preset, setPreset] = useState<DateRangePreset>('14d');
  const timezone = getBrowserTimezone();
  const today = todayInTimezone(timezone);
  const fromDate = rangeStartDate(preset, today);
  const range = useMemo(() => ({ from: fromDate, to: today }), [fromDate, today]);

  const handleStatusChange = async (next: AdsetStatus) => {
    if (next === 'killed') {
      setPendingKill(next);
      return;
    }
    await onStatusChange(adset.id, next);
  };

  const handleConfirmKill = async () => {
    if (!pendingKill) return;
    await onStatusChange(adset.id, pendingKill);
    setPendingKill(null);
  };

  const { data: entries } = useAdsetEntries(productId, campaignId, adset.id);
  const { saveEntry, deleteEntry } = useAdsetEntryMutations(
    productId,
    campaignId,
    adset.id,
  );

  const entryDates = useMemo(() => entries.map((e) => e.date), [entries]);
  const controller = useEntriesTableController({
    entryDates,
    today,
    storageKey: `adset-${adset.id}-entries`,
  });

  const historicalCount = useMemo(() => {
    const dates = new Set<string>();
    for (const e of entries) {
      if (isWithinRange(e.date, fromDate, today)) dates.add(e.date);
    }
    for (const r of controller.extras) {
      if (isWithinRange(r.date, fromDate, today)) dates.add(r.date);
    }
    return Math.max(0, dates.size - (dates.has(today) ? 1 : 0));
  }, [entries, controller.extras, fromDate, today]);

  const totals = useMemo(
    () => computeAdsetTotals(entries, range),
    [entries, range],
  );
  const health = useMemo(
    () =>
      adsetHealth({
        ctr: totals.ctr,
        lpvRate: totals.lpvRate,
        atcRate: totals.atcRate,
      }),
    [totals.ctr, totals.lpvRate, totals.atcRate],
  );

  return (
    // Visual hierarchy across multiple adsets:
    // - hover lifts the border so the pointer-anchored card reads first
    // - focus-within tints the border + adds a subtle primary ring so the
    //   adset the user is actively typing into is unambiguous
    // - transition-colors keeps both transitions soft, not jarring
    <div
      className={cn(
        'rounded-lg border border-border bg-surface transition-colors',
        'hover:border-border-strong/70',
        'focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20',
      )}
    >
      <div className="flex flex-col gap-2 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <AdsetHealthDot health={health} />
            <span className="truncate text-subheading text-text">{adset.name}</span>
            <Badge variant="outline">{adset.funnelStage}</Badge>
            <StatusMenu
              status={adset.status}
              options={ADSET_TRANSITIONS[adset.status]}
              onChange={handleStatusChange}
            />
            <span className="text-caption text-text-muted">
              {adset.budget && adset.budget > 0
                ? `Budget ${formatCurrency(adset.budget)}/day`
                : 'CBO'}
            </span>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-1">
            <EntriesToggleButton
              expanded={controller.expanded}
              historicalCount={historicalCount}
              onToggle={controller.toggleExpanded}
            />
            <BackfillButton onClick={controller.openBackfill} />
            <DateRangeSelect preset={preset} onPresetChange={setPreset} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Edit adset"
              title="Edit adset"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Delete adset"
              title="Delete adset"
              onClick={() => onDelete(adset.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <div className="min-w-0">
          <AdsetSummaryStrip totals={totals} />
        </div>
      </div>

      <div className="border-t border-border-subtle">
        <AdsetEntriesTable
          entries={entries}
          today={today}
          fromDate={fromDate}
          controller={controller}
          onSaveEntry={saveEntry}
          onDeleteEntry={deleteEntry}
        />
      </div>

      <EditAdsetDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        productName={productName}
        adset={adset}
        onSubmit={(data) => onEdit(adset.id, data)}
      />

      <ConfirmDialog
        open={pendingKill !== null}
        onOpenChange={(o) => !o && setPendingKill(null)}
        title="Kill this adset?"
        description="Status changes to killed. You can revert later — this does not delete data."
        confirmLabel="Kill"
        onConfirm={handleConfirmKill}
      />
    </div>
  );
}
