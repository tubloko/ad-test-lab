'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { useProduct } from '@/hooks/useProduct';
import { useProductEntries } from '@/hooks/useProductEntries';
import { useProductEntryMutations } from '@/hooks/useProductEntryMutations';
import { useAdsets } from '@/hooks/useAdsets';
import { useAllAdsetEntries } from '@/hooks/useAllAdsetEntries';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ProductHeader } from './ProductHeader';
import { ProductOverview } from './ProductOverview';
import { ProductTabs } from './ProductTabs';
import { deleteProduct } from '@/lib/firebase/products';
import { deleteAdset } from '@/lib/firebase/adsets';
import { getBrowserTimezone } from '@/lib/utils/date';

interface ProductDetailProps {
  productId: string;
}

export function ProductDetail({ productId }: ProductDetailProps) {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: product, loading, error } = useProduct(productId);
  const { data: entries } = useProductEntries(productId);
  const { data: adsets, loading: adsetsLoading } = useAdsets(productId);
  const adsetIds = useMemo(() => adsets.map((a) => a.id), [adsets]);
  const { byAdsetId } = useAllAdsetEntries(productId, adsetIds);
  const { saveEntry, deleteEntry } = useProductEntryMutations(productId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4">
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
      <div className="mx-auto w-full max-w-6xl space-y-3 text-center">
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
    <section className="mx-auto w-full max-w-6xl space-y-8">
      <ProductHeader product={product} onDeleteClick={() => setConfirmOpen(true)} />

      <ProductOverview
        productEntries={entries}
        adsetEntriesByAdsetId={byAdsetId}
        targetCPA={product.targetCPA}
      />

      <ProductTabs
        product={product}
        entries={entries}
        adsets={adsets}
        adsetsLoading={adsetsLoading}
        timezone={getBrowserTimezone()}
        onSaveEntry={saveEntry}
        onDeleteEntry={deleteEntry}
        onDeleteAdset={handleDeleteAdset}
      />

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
