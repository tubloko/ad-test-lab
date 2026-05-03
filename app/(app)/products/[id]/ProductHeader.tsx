'use client';

import Link from 'next/link';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import type { Product } from '@/types/product';

interface ProductHeaderProps {
  product: Product;
  onEditClick: () => void;
  onDeleteClick: () => void;
}

export function ProductHeader({ product, onEditClick, onDeleteClick }: ProductHeaderProps) {
  return (
    <div className="space-y-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-caption text-text-muted hover:text-text"
      >
        <ArrowLeft className="size-3.5" />
        All products
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-heading text-text">{product.name}</h1>
            <StatusBadge status={product.status} />
          </div>
          <p className="text-caption text-text-muted">
            Target CPA {formatCurrency(product.targetCPA)}
            {product.defaultCOGS !== undefined &&
              ` · Default COGS ${formatCurrency(product.defaultCOGS)}`}
          </p>
          {product.notes && (
            <p className="max-w-prose text-body text-text-muted">{product.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onEditClick}>
            <Pencil className="size-4" />
            Edit
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onDeleteClick}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </header>
    </div>
  );
}
