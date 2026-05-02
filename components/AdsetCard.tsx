'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from './StatusBadge';
import { ConfirmDialog } from './ConfirmDialog';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import type { Adset } from '@/types/adset';

interface AdsetCardProps {
  adset: Adset;
  productId: string;
  onDelete: (id: string) => Promise<void> | void;
}

export function AdsetCard({ adset, productId, onDelete }: AdsetCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Card className="flex-row items-center justify-between gap-4" size="sm">
      <Link
        href={`/products/${productId}/adsets/${adset.id}`}
        className="flex-1 min-w-0"
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-subheading text-text">{adset.name}</p>
          <Badge variant="outline">{adset.funnelStage}</Badge>
          <StatusBadge status={adset.status} />
        </div>
        <p className="mt-1 text-caption text-text-muted">
          {adset.audience} · Budget {formatCurrency(adset.budget)}/day
        </p>
      </Link>

      <div className="flex shrink-0 items-center gap-1">
        <Link
          href={`/products/${productId}/adsets/${adset.id}/edit`}
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
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete "${adset.name}"?`}
        description="This will permanently delete the adset and its daily entries."
        onConfirm={() => onDelete(adset.id)}
      />
    </Card>
  );
}
