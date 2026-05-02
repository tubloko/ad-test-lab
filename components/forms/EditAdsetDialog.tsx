'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AdsetForm } from './AdsetForm';
import type { Adset, AdsetInput } from '@/types/adset';

interface EditAdsetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  adset: Adset;
  onSubmit: (data: AdsetInput) => Promise<void>;
}

export function EditAdsetDialog({
  open,
  onOpenChange,
  productName,
  adset,
  onSubmit,
}: EditAdsetDialogProps) {
  const handleSubmit = async (data: AdsetInput) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit adset</DialogTitle>
          <DialogDescription>
            {productName} · {adset.name}
          </DialogDescription>
        </DialogHeader>
        <AdsetForm
          productName={productName}
          defaultValues={{
            name: adset.name,
            audience: adset.audience,
            funnelStage: adset.funnelStage,
            budget: adset.budget,
          }}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Save changes"
        />
      </DialogContent>
    </Dialog>
  );
}
