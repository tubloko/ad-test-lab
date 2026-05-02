'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from './StatusBadge';
import { AdsetEntriesTable } from '@/components/tables/AdsetEntriesTable';
import { useAdsetEntries } from '@/hooks/useAdsetEntries';
import { useAdsetEntryMutations } from '@/hooks/useAdsetEntryMutations';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { getBrowserTimezone } from '@/lib/utils/date';
import type { Adset } from '@/types/adset';

interface AdsetAccordionProps {
  productId: string;
  campaignId: string;
  adsets: Adset[];
  onConfirmDelete: (adsetId: string) => Promise<void> | void;
}

const PARAM = 'adsets';

export function AdsetAccordion({
  productId,
  campaignId,
  adsets,
  onConfirmDelete,
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
          adset={adset}
          open={openSet.has(adset.id)}
          onOpenChange={(o) => setOpen(adset.id, o)}
          onDelete={onConfirmDelete}
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
  adset,
  open,
  onOpenChange,
  onDelete,
}: {
  productId: string;
  campaignId: string;
  adset: Adset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (adsetId: string) => Promise<void> | void;
}) {
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
            Budget {formatCurrency(adset.budget)}/day
          </span>
        </div>

        <div
          className="flex shrink-0 items-center gap-1"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Link
            href={`/products/${productId}/campaigns/${campaignId}/adsets/${adset.id}/edit`}
            aria-label="Edit adset"
            className={buttonVariants({ variant: 'ghost', size: 'icon' })}
          >
            <Pencil className="size-4" />
          </Link>
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
