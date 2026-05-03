'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, FolderKanban } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useProduct } from '@/hooks/useProduct';
import { useCampaigns } from '@/hooks/useCampaigns';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { CampaignCard } from '@/components/CampaignCard';
import { ProductKPISummary } from '@/components/ProductKPISummary';
import { NewCampaignDialog } from '@/components/forms/NewCampaignDialog';
import { EditProductDialog } from '@/components/forms/EditProductDialog';
import { ProductHeader } from './ProductHeader';
import { deleteProduct, updateProduct } from '@/lib/firebase/products';
import {
  createCampaign,
  deleteCampaign,
  updateCampaign,
} from '@/lib/firebase/campaigns';
import type { CampaignInput, CampaignStatus } from '@/types/campaign';
import type { ProductInput } from '@/types/product';

interface ProductDetailProps {
  productId: string;
}

export function ProductDetail({ productId }: ProductDetailProps) {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: product, loading, error } = useProduct(productId);
  const { data: campaigns, loading: campaignsLoading } = useCampaigns(productId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [editProductOpen, setEditProductOpen] = useState(false);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-md border border-danger-border bg-danger-bg/10 p-4 text-caption text-danger-text">
        Couldn&apos;t load product: {error.message}
      </p>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-3 text-center">
        <p className="text-subheading text-text">Product not found.</p>
        <Link href="/" className={buttonVariants({ variant: 'outline' })}>
          Back to products
        </Link>
      </div>
    );
  }

  const handleDeleteProduct = async () => {
    if (!user) return;
    await deleteProduct(user.uid, productId);
    router.push('/');
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!user) return;
    await deleteCampaign(user.uid, productId, campaignId);
  };

  const handleCreateCampaign = async (data: CampaignInput) => {
    if (!user) return;
    await createCampaign(user.uid, productId, data);
  };

  const handleEditCampaign = async (campaignId: string, data: CampaignInput) => {
    if (!user) return;
    await updateCampaign(user.uid, productId, campaignId, data);
  };

  const handleCampaignStatusChange = async (
    campaignId: string,
    status: CampaignStatus,
  ) => {
    if (!user) return;
    await updateCampaign(user.uid, productId, campaignId, { status });
  };

  const handleEditProduct = async (data: ProductInput) => {
    if (!user) return;
    await updateProduct(user.uid, productId, data);
  };

  return (
    <section className="mx-auto w-full max-w-6xl space-y-8">
      <ProductHeader
        product={product}
        onEditClick={() => setEditProductOpen(true)}
        onDeleteClick={() => setConfirmOpen(true)}
      />

      <ProductKPISummary
        productId={productId}
        campaigns={campaigns}
        targetCPA={product.targetCPA}
        fees={{
          transactionFeePercent: product.transactionFeePercent,
          transactionFeeFixed: product.transactionFeeFixed,
          shippingCost: product.shippingCost,
          refundRate: product.refundRate,
        }}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-heading text-text">Campaigns</h2>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setNewCampaignOpen(true)}
          >
            <Plus className="size-4" />
            New campaign
          </Button>
        </div>

        {campaignsLoading ? (
          <Skeleton className="h-32" />
        ) : campaigns.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No campaigns yet"
            description="Campaigns hold the daily entries and verdict for one ad test. Start one to begin tracking."
            action={
              <Button type="button" onClick={() => setNewCampaignOpen(true)}>
                <Plus className="size-4" />
                Create your first campaign
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => (
              <CampaignCard
                key={c.id}
                productId={productId}
                campaign={c}
                targetCPA={product.targetCPA}
                fees={{
                  transactionFeePercent: product.transactionFeePercent,
                  transactionFeeFixed: product.transactionFeeFixed,
                  shippingCost: product.shippingCost,
                  refundRate: product.refundRate,
                }}
                onDelete={handleDeleteCampaign}
                onEdit={handleEditCampaign}
                onStatusChange={handleCampaignStatusChange}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete "${product.name}"?`}
        description="This will permanently delete the product. All campaigns, adsets, and daily entries under it will also be deleted."
        onConfirm={handleDeleteProduct}
      />

      <NewCampaignDialog
        open={newCampaignOpen}
        onOpenChange={setNewCampaignOpen}
        productName={product.name}
        onSubmit={handleCreateCampaign}
      />

      <EditProductDialog
        open={editProductOpen}
        onOpenChange={setEditProductOpen}
        product={product}
        onSubmit={handleEditProduct}
      />
    </section>
  );
}
