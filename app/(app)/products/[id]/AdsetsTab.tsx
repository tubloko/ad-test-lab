'use client';

import Link from 'next/link';
import { Plus, Layers } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AdsetCard } from '@/components/AdsetCard';
import { EmptyState } from '@/components/EmptyState';
import type { Adset } from '@/types/adset';

interface AdsetsTabProps {
  productId: string;
  adsets: Adset[];
  loading: boolean;
  onDelete: (adsetId: string) => Promise<void>;
}

export function AdsetsTab({ productId, adsets, loading, onDelete }: AdsetsTabProps) {
  if (loading) {
    return <Skeleton className="h-20" />;
  }

  if (adsets.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="No adsets yet"
        description="Add an adset to start logging clicks, LPVs, ATCs, and ICs."
        action={
          <Link
            href={`/products/${productId}/adsets/new`}
            className={buttonVariants({ variant: 'default' })}
          >
            <Plus className="size-4" />
            New adset
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href={`/products/${productId}/adsets/new`}
          className={buttonVariants({ variant: 'default', size: 'sm' })}
        >
          <Plus className="size-4" />
          New adset
        </Link>
      </div>
      <ul className="space-y-3">
        {adsets.map((adset) => (
          <li key={adset.id}>
            <AdsetCard adset={adset} productId={productId} onDelete={onDelete} />
          </li>
        ))}
      </ul>
    </div>
  );
}
