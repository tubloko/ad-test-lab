'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { ProductForm } from '@/components/forms/ProductForm';
import { createProduct } from '@/lib/firebase/products';
import type { ProductInput } from '@/types/product';

export default function NewProductPage() {
  const router = useRouter();
  const { data: user } = useUser();

  const handleSubmit = async (data: ProductInput) => {
    if (!user) return;
    const id = await createProduct(user.uid, data);
    router.push(`/products/${id}`);
  };

  return (
    <section className="mx-auto w-full max-w-xl space-y-6">
      <header>
        <h1 className="text-heading text-text">New product</h1>
        <p className="text-body text-text-muted">
          A product groups all your adsets and daily numbers for one item being tested.
        </p>
      </header>
      <ProductForm
        onSubmit={handleSubmit}
        onCancel={() => router.push('/')}
        submitLabel="Create product"
      />
    </section>
  );
}
