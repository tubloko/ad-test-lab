'use client';

import { useCallback, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from './StatusBadge';
import { AdsetEntriesTable } from '@/components/tables/AdsetEntriesTable';
import { EditAdsetDialog } from '@/components/forms/EditAdsetDialog';
import { useAdsetEntries } from '@/hooks/useAdsetEntries';
import { useAdsetEntryMutations } from '@/hooks/useAdsetEntryMutations';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { getBrowserTimezone } from '@/lib/utils/date';
import type { Adset, AdsetInput } from '@/types/adset';

interface AdsetAccordionProps {
  productId: string;
  campaignId: string;
  productName: string;
  adsets: Adset[];
  onConfirmDelete: (adsetId: string) => Promise<void> | void;
  onEdit: (adsetId: string, data: AdsetInput) => Promise<void>;
}

const PARAM = 'adsets';

export function AdsetAccordion({
  productId,
  campaignId,
  productName,
  adsets,
  onConfirmDelete,
  onEdit,
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
          open={openSet.has(adset.id)}
          onOpenChange={(o) => setOpen(adset.id, o)}
          onDelete={onConfirmDelete}
          onEdit={onEdit}
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
  open,
  onOpenChange,
  onDelete,
  onEdit,
}: {
  productId: string;
  campaignId: string;
  productName: string;
  adset: Adset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (adsetId: string) => Promise<void> | void;
  onEdit: (adsetId: string, data: AdsetInput) => Promise<void>;
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <details
      open={open}
      onToggle={(e) => onOpenChange((e.currentTarget as HTMLDetailsElement).open)}
      className="rounded-lg border border-border bg-surface"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <ChevronDown
            className={`size-4 shrink-0 text-text-muted transition-transform ${open ? 'rotate-0' : '-rotate-90'}`}
          />
          <span className="truncate text-subheading text-text">{adset.name}</span>
          <Badge variant="outline">{adset.funnelStage}</Badge>
          <StatusBadge status={adset.status} />
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
      </summary>

      <div className="border-t border-border-subtle p-4">
        {open && (
          <AdsetEntriesTableForAdset
            productId={productId}
            campaignId={campaignId}
            adsetId={adset.id}
          />
        )}
      </div>

      <EditAdsetDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        productName={productName}
        adset={adset}
        onSubmit={(data) => onEdit(adset.id, data)}
      />
    </details>
  );
}

function AdsetEntriesTableForAdset({
  productId,
  campaignId,
  adsetId,
}: {
  productId: string;
  campaignId: string;
  adsetId: string;
}) {
  const { data: entries } = useAdsetEntries(productId, campaignId, adsetId);
  const { saveEntry, deleteEntry } = useAdsetEntryMutations(
    productId,
    campaignId,
    adsetId,
  );

  return (
    <AdsetEntriesTable
      entries={entries}
      timezone={getBrowserTimezone()}
      onSaveEntry={saveEntry}
      onDeleteEntry={deleteEntry}
    />
  );
}
