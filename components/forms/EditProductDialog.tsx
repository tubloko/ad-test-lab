'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProductForm } from './ProductForm';
import type { Product, ProductInput } from '@/types/product';

interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  onSubmit: (data: ProductInput) => Promise<void>;
}

export function EditProductDialog({
  open,
  onOpenChange,
  product,
  onSubmit,
}: EditProductDialogProps) {
  const handleSubmit = async (data: ProductInput) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit product</DialogTitle>
        </DialogHeader>
        <ProductForm
          defaultValues={{
            name: product.name,
            targetCPA: product.targetCPA,
            defaultCOGS: product.defaultCOGS,
            notes: product.notes,
            transactionFeePercent: product.transactionFeePercent,
            transactionFeeFixed: product.transactionFeeFixed,
            shippingCost: product.shippingCost,
            refundRate: product.refundRate,
          }}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Save changes"
        />
      </DialogContent>
    </Dialog>
  );
}
