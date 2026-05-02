'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from './StatusBadge';
import { ConfirmDialog } from './ConfirmDialog';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import type { Product } from '@/types/product';

interface ProductCardProps {
  product: Product;
  onDelete: (id: string) => Promise<void> | void;
}

export function ProductCard({ product, onDelete }: ProductCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Card className="flex-row items-center justify-between gap-4">
      <Link href={`/products/${product.id}`} className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <p className="truncate text-subheading text-text">{product.name}</p>
          <StatusBadge status={product.status} />
        </div>
        <p className="mt-1 text-caption text-text-muted">
          Target CPA {formatCurrency(product.targetCPA)}
        </p>
      </Link>

      <div className="flex shrink-0 items-center gap-1">
        <Link
          href={`/products/${product.id}/edit`}
          aria-label="Edit product"
          className={buttonVariants({ variant: 'ghost', size: 'icon' })}
        >
          <Pencil className="size-4" />
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Delete product"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete "${product.name}"?`}
        description="This will permanently delete the product. All adsets and daily entries under it will also be deleted."
        onConfirm={() => onDelete(product.id)}
      />
    </Card>
  );
}
