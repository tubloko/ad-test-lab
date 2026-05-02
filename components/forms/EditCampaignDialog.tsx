'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CampaignForm } from './CampaignForm';
import type { Campaign, CampaignInput } from '@/types/campaign';

interface EditCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign;
  onSubmit: (data: CampaignInput) => Promise<void>;
}

export function EditCampaignDialog({
  open,
  onOpenChange,
  campaign,
  onSubmit,
}: EditCampaignDialogProps) {
  const handleSubmit = async (data: CampaignInput) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit campaign</DialogTitle>
        </DialogHeader>
        <CampaignForm
          defaultValues={{ name: campaign.name, notes: campaign.notes }}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Save changes"
        />
      </DialogContent>
    </Dialog>
  );
}
