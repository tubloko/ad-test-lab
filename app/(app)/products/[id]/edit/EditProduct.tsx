'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useProduct } from '@/hooks/useProduct';
import { ProductForm } from '@/components/forms/ProductForm';
import { Skeleton } from '@/components/ui/skeleton';
import { updateProduct } from '@/lib/firebase/products';
import type { ProductInput } from '@/types/product';

interface EditProductProps {
  productId: string;
}

export function EditProduct({ productId }: EditProductProps) {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: product, loading, error } = useProduct(productId);

  const handleSubmit = async (data: ProductInput) => {
    if (!user) return;
    await updateProduct(user.uid, productId, data);
    router.push(`/products/${productId}`);
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <p className="rounded-md border border-danger-border bg-danger-bg/10 p-4 text-caption text-danger-text">
        Couldn&apos;t load product.
      </p>
    );
  }

  return (
    <section className="mx-auto w-full max-w-xl space-y-6">
      <header>
        <h1 className="text-heading text-text">Edit product</h1>
        <p className="text-body text-text-muted">{product.name}</p>
      </header>
      <ProductForm
        defaultValues={{
          name: product.name,
          targetCPA: product.targetCPA,
          defaultCOGS: product.defaultCOGS,
          notes: product.notes,
        }}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/products/${productId}`)}
        submitLabel="Save changes"
      />
    </section>
  );
}
