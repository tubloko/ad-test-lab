'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Pencil, Plus, Trash2, Layers } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useProduct } from '@/hooks/useProduct';
import { useAdsets } from '@/hooks/useAdsets';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/StatusBadge';
import { AdsetCard } from '@/components/AdsetCard';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { deleteProduct } from '@/lib/firebase/products';
import { deleteAdset } from '@/lib/firebase/adsets';
import { formatCurrency } from '@/lib/utils/formatCurrency';

interface ProductDetailProps {
  productId: string;
}

export function ProductDetail({ productId }: ProductDetailProps) {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: product, loading, error } = useProduct(productId);
  const { data: adsets, loading: adsetsLoading } = useAdsets(productId);
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
        Couldn&apos;t load product: {error.message}
      </p>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-3 text-center">
        <p className="text-subheading text-text">Product not found.</p>
        <Link href="/" className={buttonVariants({ variant: 'outline' })}>
          Back to products
        </Link>
      </div>
    );
  }

  const handleDeleteProduct = async () => {
    if (!user) return;
    await deleteProduct(user.uid, productId);
    router.push('/');
  };

  const handleDeleteAdset = async (adsetId: string) => {
    if (!user) return;
    await deleteAdset(user.uid, productId, adsetId);
  };

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-caption text-text-muted hover:text-text"
      >
        <ArrowLeft className="size-3.5" />
        All products
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-heading text-text">{product.name}</h1>
            <StatusBadge status={product.status} />
          </div>
          <p className="text-caption text-text-muted">
            Target CPA {formatCurrency(product.targetCPA)}
            {product.defaultCOGS !== undefined &&
              ` · Default COGS ${formatCurrency(product.defaultCOGS)}`}
          </p>
          {product.notes && (
            <p className="max-w-prose text-body text-text-muted">{product.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/products/${productId}/edit`}
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

      <Tabs defaultValue="adsets" className="w-full">
        <TabsList>
          <TabsTrigger value="adsets">Adsets</TabsTrigger>
          <TabsTrigger value="entries">Daily entries</TabsTrigger>
        </TabsList>

        <TabsContent value="adsets" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Link
              href={`/products/${productId}/adsets/new`}
              className={buttonVariants({ variant: 'default', size: 'sm' })}
            >
              <Plus className="size-4" />
              New adset
            </Link>
          </div>

          {adsetsLoading ? (
            <Skeleton className="h-20" />
          ) : adsets.length === 0 ? (
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
          ) : (
            <ul className="space-y-3">
              {adsets.map((adset) => (
                <li key={adset.id}>
                  <AdsetCard
                    adset={adset}
                    productId={productId}
                    onDelete={handleDeleteAdset}
                  />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="entries" className="pt-4">
          <p className="text-caption text-text-muted">
            Daily entry tracking lands in the next milestone.
          </p>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete "${product.name}"?`}
        description="This will permanently delete the product. All adsets and daily entries under it will also be deleted."
        onConfirm={handleDeleteProduct}
      />
    </section>
  );
}
