'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useProduct } from '@/hooks/useProduct';
import { AdsetForm } from '@/components/forms/AdsetForm';
import { Skeleton } from '@/components/ui/skeleton';
import { createAdset } from '@/lib/firebase/adsets';
import type { AdsetInput } from '@/types/adset';

interface NewAdsetProps {
  productId: string;
}

export function NewAdset({ productId }: NewAdsetProps) {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: product, loading } = useProduct(productId);

  const handleSubmit = async (data: AdsetInput) => {
    if (!user) return;
    await createAdset(user.uid, productId, data);
    router.push(`/products/${productId}`);
  };

  if (loading || !product) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-xl space-y-6">
      <header>
        <h1 className="text-heading text-text">New adset</h1>
        <p className="text-body text-text-muted">For {product.name}</p>
      </header>
      <AdsetForm
        productName={product.name}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/products/${productId}`)}
        submitLabel="Create adset"
      />
    </section>
  );
}
