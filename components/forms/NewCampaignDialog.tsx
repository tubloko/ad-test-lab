'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CampaignForm } from './CampaignForm';
import type { CampaignInput } from '@/types/campaign';

interface NewCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  onSubmit: (data: CampaignInput) => Promise<void>;
}

export function NewCampaignDialog({
  open,
  onOpenChange,
  productName,
  onSubmit,
}: NewCampaignDialogProps) {
  const handleSubmit = async (data: CampaignInput) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New campaign</DialogTitle>
          <DialogDescription>For {productName}</DialogDescription>
        </DialogHeader>
        <CampaignForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Create campaign"
        />
      </DialogContent>
    </Dialog>
  );
}
