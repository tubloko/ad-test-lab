'use client';

import Link from 'next/link';
import { Plus, Package } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useProducts } from '@/hooks/useProducts';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { deleteProduct } from '@/lib/firebase/products';

export default function DashboardPage() {
  const { data: user } = useUser();
  const { data: products, loading, error } = useProducts();

  const handleDelete = async (productId: string) => {
    if (!user) return;
    await deleteProduct(user.uid, productId);
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
        <Link href="/products/new" className={buttonVariants({ variant: 'default' })}>
          <Plus className="size-4" />
          New product
        </Link>
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
            <Link href="/products/new" className={buttonVariants({ variant: 'default' })}>
              <Plus className="size-4" />
              New product
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} onDelete={handleDelete} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
