'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, Package } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useProducts } from '@/hooks/useProducts';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NewProductDialog } from '@/components/forms/NewProductDialog';
import { createProduct, deleteProduct, updateProduct } from '@/lib/firebase/products';
import type { ProductInput } from '@/types/product';

export default function DashboardPage() {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: products, loading, error } = useProducts();
  const [newOpen, setNewOpen] = useState(false);

  const handleCreate = async (data: ProductInput) => {
    if (!user) return;
    const id = await createProduct(user.uid, data);
    router.push(`/products/${id}`);
  };

  const handleDelete = async (productId: string) => {
    if (!user) return;
    await deleteProduct(user.uid, productId);
  };

  const handleEdit = async (productId: string, data: ProductInput) => {
    if (!user) return;
    await updateProduct(user.uid, productId, data);
  };

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-heading text-text">Products</h1>
          <p className="text-body text-text-muted">
            Each product is a separate ad test. Add adsets and daily numbers to get a verdict.
          </p>
        </div>
        <Button type="button" onClick={() => setNewOpen(true)}>
          <Plus className="size-4" />
          New product
        </Button>
      </header>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : error ? (
        <p className="rounded-md border border-danger-border bg-danger-bg/10 p-4 text-caption text-danger-text">
          Couldn&apos;t load products: {error.message}
        </p>
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Create your first product to start tracking ad tests."
          action={
            <Button type="button" onClick={() => setNewOpen(true)}>
              <Plus className="size-4" />
              New product
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} onDelete={handleDelete} onEdit={handleEdit} />
            </li>
          ))}
        </ul>
      )}

      <NewProductDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onSubmit={handleCreate}
      />
    </section>
  );
}
