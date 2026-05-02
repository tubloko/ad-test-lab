'use client';

import { useUser } from '@/hooks/useUser';
import { useProducts } from '@/hooks/useProducts';

export default function DashboardPage() {
  const { data: user } = useUser();
  const { data: products, loading } = useProducts();

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-h1 font-semibold text-text">
          Welcome, {user?.displayName ?? 'there'}
        </h1>
        <p className="text-body text-text-muted">Your ad tests live here.</p>
      </header>

      <div className="rounded-lg border border-border bg-surface p-6">
        {loading ? (
          <p className="text-text-muted">Loading products…</p>
        ) : products.length === 0 ? (
          <p className="text-text-muted">
            No products yet. We&apos;ll add the create flow next.
          </p>
        ) : (
          <ul className="space-y-2">
            {products.map((product) => (
              <li key={product.id} className="text-text">
                {product.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
