'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useAdset } from '@/hooks/useAdset';
import { useProduct } from '@/hooks/useProduct';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { deleteAdset } from '@/lib/firebase/adsets';
import { formatCurrency } from '@/lib/utils/formatCurrency';

interface AdsetDetailProps {
  productId: string;
  adsetId: string;
}

export function AdsetDetail({ productId, adsetId }: AdsetDetailProps) {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: product } = useProduct(productId);
  const { data: adset, loading, error } = useAdset(productId, adsetId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-md border border-danger-border bg-danger-bg/10 p-4 text-caption text-danger-text">
        Couldn&apos;t load adset: {error.message}
      </p>
    );
  }

  if (!adset) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-3 text-center">
        <p className="text-subheading text-text">Adset not found.</p>
        <Link
          href={`/products/${productId}`}
          className={buttonVariants({ variant: 'outline' })}
        >
          Back to product
        </Link>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!user) return;
    await deleteAdset(user.uid, productId, adsetId);
    router.push(`/products/${productId}`);
  };

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <Link
        href={`/products/${productId}`}
        className="inline-flex items-center gap-1 text-caption text-text-muted hover:text-text"
      >
        <ArrowLeft className="size-3.5" />
        {product?.name ?? 'Product'}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-heading text-text">{adset.name}</h1>
            <Badge variant="outline">{adset.funnelStage}</Badge>
            <StatusBadge status={adset.status} />
          </div>
          <p className="text-caption text-text-muted">
            {adset.audience} · Budget {formatCurrency(adset.budget)}/day
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/products/${productId}/adsets/${adsetId}/edit`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <Pencil className="size-4" />
            Edit
          </Link>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </header>

      <Tabs defaultValue="entries" className="w-full">
        <TabsList>
          <TabsTrigger value="entries">Daily entries</TabsTrigger>
        </TabsList>
        <TabsContent value="entries" className="pt-4">
          <p className="text-caption text-text-muted">
            Daily entry tracking lands in the next milestone.
          </p>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete "${adset.name}"?`}
        description="This will permanently delete the adset and its daily entries."
        onConfirm={handleDelete}
      />
    </section>
  );
}
