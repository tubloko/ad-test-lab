'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useCampaign } from '@/hooks/useCampaign';
import { CampaignForm } from '@/components/forms/CampaignForm';
import { Skeleton } from '@/components/ui/skeleton';
import { updateCampaign } from '@/lib/firebase/campaigns';
import type { CampaignInput } from '@/types/campaign';

interface EditCampaignProps {
  productId: string;
  campaignId: string;
}

export function EditCampaign({ productId, campaignId }: EditCampaignProps) {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: campaign, loading, error } = useCampaign(productId, campaignId);

  const handleSubmit = async (data: CampaignInput) => {
    if (!user) return;
    await updateCampaign(user.uid, productId, campaignId, data);
    router.push(`/products/${productId}/campaigns/${campaignId}`);
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <p className="rounded-md border border-danger-border bg-danger-bg/10 p-4 text-caption text-danger-text">
        Couldn&apos;t load campaign.
      </p>
    );
  }

  return (
    <section className="mx-auto w-full max-w-xl space-y-6">
      <header>
        <h1 className="text-heading text-text">Edit campaign</h1>
        <p className="text-body text-text-muted">{campaign.name}</p>
      </header>
      <CampaignForm
        defaultValues={{
          name: campaign.name,
          notes: campaign.notes,
        }}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/products/${productId}/campaigns/${campaignId}`)}
        submitLabel="Save changes"
      />
    </section>
  );
}
