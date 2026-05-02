'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useProduct } from '@/hooks/useProduct';
import { useCampaign } from '@/hooks/useCampaign';
import { AdsetForm } from '@/components/forms/AdsetForm';
import { Skeleton } from '@/components/ui/skeleton';
import { createAdset } from '@/lib/firebase/adsets';
import type { AdsetInput } from '@/types/adset';

interface NewAdsetProps {
  productId: string;
  campaignId: string;
}

export function NewAdset({ productId, campaignId }: NewAdsetProps) {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: product, loading: productLoading } = useProduct(productId);
  const { data: campaign, loading: campaignLoading } = useCampaign(productId, campaignId);

  const handleSubmit = async (data: AdsetInput) => {
    if (!user) return;
    await createAdset(user.uid, productId, campaignId, data);
    router.push(`/products/${productId}/campaigns/${campaignId}`);
  };

  if (productLoading || campaignLoading || !product || !campaign) {
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
        <h1 className="text-heading text-text">New adset</h1>
        <p className="text-body text-text-muted">
          {product.name} · {campaign.name}
        </p>
      </header>
      <AdsetForm
        productName={product.name}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/products/${productId}/campaigns/${campaignId}`)}
        submitLabel="Create adset"
      />
    </section>
  );
}
