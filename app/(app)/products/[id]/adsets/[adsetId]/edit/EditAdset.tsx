'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useProduct } from '@/hooks/useProduct';
import { useAdset } from '@/hooks/useAdset';
import { AdsetForm } from '@/components/forms/AdsetForm';
import { Skeleton } from '@/components/ui/skeleton';
import { updateAdset } from '@/lib/firebase/adsets';
import type { AdsetInput } from '@/types/adset';

interface EditAdsetProps {
  productId: string;
  adsetId: string;
}

export function EditAdset({ productId, adsetId }: EditAdsetProps) {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: product } = useProduct(productId);
  const { data: adset, loading, error } = useAdset(productId, adsetId);

  const handleSubmit = async (data: AdsetInput) => {
    if (!user) return;
    await updateAdset(user.uid, productId, adsetId, data);
    router.push(`/products/${productId}/adsets/${adsetId}`);
  };

  if (loading || !product) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !adset) {
    return (
      <p className="rounded-md border border-danger-border bg-danger-bg/10 p-4 text-caption text-danger-text">
        Couldn&apos;t load adset.
      </p>
    );
  }

  return (
    <section className="mx-auto w-full max-w-xl space-y-6">
      <header>
        <h1 className="text-heading text-text">Edit adset</h1>
        <p className="text-body text-text-muted">
          {product.name} · {adset.name}
        </p>
      </header>
      <AdsetForm
        productName={product.name}
        defaultValues={{
          name: adset.name,
          audience: adset.audience,
          funnelStage: adset.funnelStage,
          budget: adset.budget,
        }}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/products/${productId}/adsets/${adsetId}`)}
        submitLabel="Save changes"
      />
    </section>
  );
}
