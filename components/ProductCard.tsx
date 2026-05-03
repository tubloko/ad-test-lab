'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from './StatusBadge';
import { ConfirmDialog } from './ConfirmDialog';
import { EditProductDialog } from '@/components/forms/EditProductDialog';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import type { Product, ProductInput } from '@/types/product';

interface ProductCardProps {
  product: Product;
  onDelete: (id: string) => Promise<void> | void;
  onEdit: (id: string, data: ProductInput) => Promise<void>;
}

export function ProductCard({ product, onDelete, onEdit }: ProductCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Edit product"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="size-4" />
        </Button>
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

      <EditProductDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        product={product}
        onSubmit={(data) => onEdit(product.id, data)}
      />
    </Card>
  );
}
