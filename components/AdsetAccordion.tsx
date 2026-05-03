'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusMenu } from './StatusMenu';
import { ConfirmDialog } from './ConfirmDialog';
import { AdsetHealthDot } from './AdsetHealthDot';
import { AdsetSummaryStrip } from './AdsetSummaryStrip';
import { AdsetEntriesTable } from '@/components/tables/AdsetEntriesTable';
import { EditAdsetDialog } from '@/components/forms/EditAdsetDialog';
import { useAdsetEntries } from '@/hooks/useAdsetEntries';
import { useAdsetEntryMutations } from '@/hooks/useAdsetEntryMutations';
import { computeAdsetTotals, type DateRange } from '@/lib/metrics/adsetTotals';
import { adsetHealth } from '@/lib/utils/adset-health';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { getBrowserTimezone } from '@/lib/utils/date';
import {
  ADSET_TRANSITIONS,
  type Adset,
  type AdsetInput,
  type AdsetStatus,
} from '@/types/adset';

interface AdsetAccordionProps {
  productId: string;
  campaignId: string;
  productName: string;
  adsets: Adset[];
  /** Date range used for totals + health on every adset summary. */
  range: DateRange;
  onConfirmDelete: (adsetId: string) => Promise<void> | void;
  onEdit: (adsetId: string, data: AdsetInput) => Promise<void>;
  onStatusChange: (adsetId: string, status: AdsetStatus) => Promise<void>;
}

const PARAM = 'adsets';

export function AdsetAccordion({
  productId,
  campaignId,
  productName,
  adsets,
  range,
  onConfirmDelete,
  onEdit,
  onStatusChange,
}: AdsetAccordionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const openSet = parseOpen(search.get(PARAM));

  const setOpen = useCallback(
    (id: string, isOpen: boolean) => {
      const next = new Set(openSet);
      if (isOpen) next.add(id);
      else next.delete(id);
      const sp = new URLSearchParams(search.toString());
      if (next.size === 0) sp.delete(PARAM);
      else sp.set(PARAM, [...next].join(','));
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [openSet, pathname, router, search],
  );

  if (adsets.length === 0) return null;

  return (
    <div className="space-y-3">
      {adsets.map((adset) => (
        <AdsetItem
          key={adset.id}
          productId={productId}
          campaignId={campaignId}
          productName={productName}
          adset={adset}
          range={range}
          open={openSet.has(adset.id)}
          onOpenChange={(o) => setOpen(adset.id, o)}
          onDelete={onConfirmDelete}
          onEdit={onEdit}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  );
}

function parseOpen(raw: string | null): Set<string> {
  if (!raw) return new Set();
  return new Set(raw.split(',').filter(Boolean));
}

function AdsetItem({
  productId,
  campaignId,
  productName,
  adset,
  range,
  open,
  onOpenChange,
  onDelete,
  onEdit,
  onStatusChange,
}: {
  productId: string;
  campaignId: string;
  productName: string;
  adset: Adset;
  range: DateRange;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (adsetId: string) => Promise<void> | void;
  onEdit: (adsetId: string, data: AdsetInput) => Promise<void>;
  onStatusChange: (adsetId: string, status: AdsetStatus) => Promise<void>;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [pendingKill, setPendingKill] = useState<AdsetStatus | null>(null);

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

  // Always-fetched so the totals + health dot are accurate even when the
  // accordion is collapsed. Live snapshot from Firestore.
  const { data: entries } = useAdsetEntries(productId, campaignId, adset.id);
  const { saveEntry, deleteEntry } = useAdsetEntryMutations(
    productId,
    campaignId,
    adset.id,
  );

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
    <div className="rounded-lg border border-border bg-surface">
      <details
        open={open}
        onToggle={(e) => onOpenChange((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="flex cursor-pointer list-none flex-col gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <ChevronDown
                className={`size-4 shrink-0 text-text-muted transition-transform ${
                  open ? 'rotate-0' : '-rotate-90'
                }`}
              />
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

            <div
              className="flex shrink-0 items-center gap-1"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Edit adset"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Delete adset"
                onClick={() => onDelete(adset.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>

          {/* Five-metric summary, always visible whether expanded or
              collapsed. Wraps on narrow viewports — never forces scroll. */}
          <div className="ml-7 min-w-0">
            <AdsetSummaryStrip totals={totals} />
          </div>
        </summary>
      </details>

      {open && (
        <div className="border-t border-border-subtle p-4">
          <AdsetEntriesTable
            entries={entries}
            timezone={getBrowserTimezone()}
            onSaveEntry={saveEntry}
            onDeleteEntry={deleteEntry}
          />
        </div>
      )}

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
