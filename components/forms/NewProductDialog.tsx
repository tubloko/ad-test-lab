'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProductForm } from './ProductForm';
import type { ProductInput } from '@/types/product';

interface NewProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProductInput) => Promise<void>;
}

export function NewProductDialog({
  open,
  onOpenChange,
  onSubmit,
}: NewProductDialogProps) {
  const handleSubmit = async (data: ProductInput) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New product</DialogTitle>
          <DialogDescription>
            A product groups all your campaigns and daily numbers for one item being tested.
          </DialogDescription>
        </DialogHeader>
        <ProductForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Create product"
        />
      </DialogContent>
    </Dialog>
  );
}
