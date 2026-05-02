'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useProduct } from '@/hooks/useProduct';
import { CampaignForm } from '@/components/forms/CampaignForm';
import { Skeleton } from '@/components/ui/skeleton';
import { createCampaign } from '@/lib/firebase/campaigns';
import type { CampaignInput } from '@/types/campaign';

interface NewCampaignProps {
  productId: string;
}

export function NewCampaign({ productId }: NewCampaignProps) {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: product, loading } = useProduct(productId);

  const handleSubmit = async (data: CampaignInput) => {
    if (!user) return;
    const id = await createCampaign(user.uid, productId, data);
    router.push(`/products/${productId}/campaigns/${id}`);
  };

  if (loading || !product) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-xl space-y-6">
      <header>
        <h1 className="text-heading text-text">New campaign</h1>
        <p className="text-body text-text-muted">For {product.name}</p>
      </header>
      <CampaignForm
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/products/${productId}`)}
        submitLabel="Create campaign"
      />
    </section>
  );
}
