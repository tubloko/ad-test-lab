'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AdsetForm } from './AdsetForm';
import type { AdsetInput } from '@/types/adset';

interface NewAdsetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  onSubmit: (data: AdsetInput) => Promise<void>;
}

export function NewAdsetDialog({
  open,
  onOpenChange,
  productName,
  onSubmit,
}: NewAdsetDialogProps) {
  const handleSubmit = async (data: AdsetInput) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New adset</DialogTitle>
          <DialogDescription>For {productName}</DialogDescription>
        </DialogHeader>
        <AdsetForm
          productName={productName}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Create adset"
        />
      </DialogContent>
    </Dialog>
  );
}
