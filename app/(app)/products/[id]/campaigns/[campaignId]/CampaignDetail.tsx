'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowLeft, Pencil, Trash2, Plus, ListTodo, Layers, ChevronDown } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useProduct } from '@/hooks/useProduct';
import { useCampaign } from '@/hooks/useCampaign';
import { useCampaignEntries } from '@/hooks/useCampaignEntries';
import { useCampaignEntryMutations } from '@/hooks/useCampaignEntryMutations';
import { useAdsets } from '@/hooks/useAdsets';
import { useAllAdsetEntries } from '@/hooks/useAllAdsetEntries';
import { useDateRangePreset } from '@/hooks/useDateRangePreset';
import { useVerdict } from '@/hooks/useVerdict';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { StatusMenu } from '@/components/StatusMenu';
import { StickyVerdictBar } from '@/components/verdict/StickyVerdictBar';
import { AIDiagnosisPanel } from '@/components/verdict/AIDiagnosisPanel';
import { computeProfitWithFees } from '@/lib/metrics/profitWithFees';
import { computeAdsetTotals } from '@/lib/metrics/adsetTotals';
import { CampaignEntriesTable } from '@/components/tables/CampaignEntriesTable';
import { AdsetAccordion } from '@/components/AdsetAccordion';
import { NewAdsetDialog } from '@/components/forms/NewAdsetDialog';
import { EditCampaignDialog } from '@/components/forms/EditCampaignDialog';
import { SpendVsRevenueChart } from '@/components/charts/SpendVsRevenueChart';
import { CPATrendChart } from '@/components/charts/CPATrendChart';
import { AdsetTrendChart } from '@/components/charts/AdsetTrendChart';
import { deleteCampaign, updateCampaign } from '@/lib/firebase/campaigns';
import { createAdset, deleteAdset, updateAdset } from '@/lib/firebase/adsets';
import type { AdsetInput, AdsetStatus } from '@/types/adset';
import {
  CAMPAIGN_TRANSITIONS,
  type CampaignInput,
  type CampaignStatus,
} from '@/types/campaign';
import { rangeStartDate } from '@/lib/utils/dateRange';
import { todayInTimezone, getBrowserTimezone } from '@/lib/utils/date';

interface CampaignDetailProps {
  productId: string;
  campaignId: string;
}

export function CampaignDetail({ productId, campaignId }: CampaignDetailProps) {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: product } = useProduct(productId);
  const { data: campaign, loading, error } = useCampaign(productId, campaignId);
  const { data: entries, adsetSpendByDate } = useCampaignEntries(productId, campaignId);
  const { saveEntry, deleteEntry } = useCampaignEntryMutations(
    productId,
    campaignId,
  );
  const { data: adsets } = useAdsets(productId, campaignId);
  const adsetIds = useMemo(() => adsets.map((a) => a.id), [adsets]);
  const { byAdsetId } = useAllAdsetEntries(productId, campaignId, adsetIds);
  const adsetEntries = useMemo(
    () => adsetIds.map((id) => byAdsetId[id] ?? []),
    [adsetIds, byAdsetId],
  );

  const { preset, setPreset } = useDateRangePreset('14d');
  const today = todayInTimezone(getBrowserTimezone());
  const fromDate = rangeStartDate(preset, today);
  const range = useMemo(() => ({ from: fromDate, to: today }), [fromDate, today]);

  const targetCPA = product?.targetCPA ?? 0;
  const fees = useMemo(
    () => ({
      transactionFeePercent: product?.transactionFeePercent,
      transactionFeeFixed: product?.transactionFeeFixed,
      shippingCost: product?.shippingCost,
      refundRate: product?.refundRate,
    }),
    [
      product?.transactionFeePercent,
      product?.transactionFeeFixed,
      product?.shippingCost,
      product?.refundRate,
    ],
  );
  const { result, input } = useVerdict({
    campaignEntries: entries,
    adsetEntries,
    targetCPA,
    range,
    fees,
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [newAdsetOpen, setNewAdsetOpen] = useState(false);
  const [editCampaignOpen, setEditCampaignOpen] = useState(false);
  const [pendingKill, setPendingKill] = useState<CampaignStatus | null>(null);

  const profitBreakdown = useMemo(
    () =>
      computeProfitWithFees({
        revenue: input.totalRevenue,
        spend: input.totalSpend,
        cogs: input.totalCOGS,
        orders: input.totalOrders,
        transactionFeePercent: input.transactionFeePercent,
        transactionFeeFixed: input.transactionFeeFixed,
        shippingCost: input.shippingCost,
        refundRate: input.refundRate,
      }),
    [input],
  );

  const adsetBreakdown = useMemo(
    () =>
      adsets
        .map((a) => {
          const entries = byAdsetId[a.id] ?? [];
          const totals = computeAdsetTotals(entries, range);
          if (!totals.hasData) return null;
          return {
            name: a.name,
            spend: totals.totalSpend,
            ctr: totals.ctrTracked ? totals.ctr : undefined,
            atcRate: totals.totalLPV > 0 ? totals.atcRate : undefined,
          };
        })
        .filter((a): a is NonNullable<typeof a> => a !== null),
    [adsets, byAdsetId, range],
  );

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
        Couldn&apos;t load campaign: {error.message}
      </p>
    );
  }

  if (!campaign) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-3 text-center">
        <p className="text-subheading text-text">Campaign not found.</p>
        <Link
          href={`/products/${productId}`}
          className={buttonVariants({ variant: 'outline' })}
        >
          Back to product
        </Link>
      </div>
    );
  }

  const handleDeleteCampaign = async () => {
    if (!user) return;
    await deleteCampaign(user.uid, productId, campaignId);
    router.push(`/products/${productId}`);
  };

  const handleDeleteAdset = async (adsetId: string) => {
    if (!user) return;
    await deleteAdset(user.uid, productId, campaignId, adsetId);
  };

  const handleCreateAdset = async (data: AdsetInput) => {
    if (!user) return;
    await createAdset(user.uid, productId, campaignId, data);
  };

  const handleEditAdset = async (adsetId: string, data: AdsetInput) => {
    if (!user) return;
    await updateAdset(user.uid, productId, campaignId, adsetId, data);
  };

  const handleAdsetStatusChange = async (adsetId: string, status: AdsetStatus) => {
    if (!user) return;
    await updateAdset(user.uid, productId, campaignId, adsetId, { status });
  };

  const handleEditCampaign = async (data: CampaignInput) => {
    if (!user) return;
    await updateCampaign(user.uid, productId, campaignId, data);
  };

  const handleStatusChange = async (next: CampaignStatus) => {
    if (!user) return;
    if (next === 'killed') {
      setPendingKill(next);
      return;
    }
    await updateCampaign(user.uid, productId, campaignId, { status: next });
  };

  const handleConfirmKill = async () => {
    if (!user || !pendingKill) return;
    await updateCampaign(user.uid, productId, campaignId, { status: pendingKill });
    setPendingKill(null);
  };

  const hasAnyData = entries.length > 0 || adsetIds.some((id) => (byAdsetId[id]?.length ?? 0) > 0);

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <StickyVerdictBar
        result={result}
        input={input}
        targetCPA={targetCPA}
        preset={preset}
        onPresetChange={setPreset}
        fees={fees}
      />

      <Link
        href={`/products/${productId}`}
        className="inline-flex items-center gap-1 text-caption text-text-muted hover:text-text"
      >
        <ArrowLeft className="size-3.5" />
        {product?.name ?? 'Product'}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-heading text-text">{campaign.name}</h1>
            <StatusMenu
              status={campaign.status}
              options={CAMPAIGN_TRANSITIONS[campaign.status]}
              onChange={handleStatusChange}
            />
          </div>
          {campaign.notes && (
            <p className="max-w-prose text-body text-text-muted">{campaign.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditCampaignOpen(true)}
          >
            <Pencil className="size-4" />
            Edit
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </header>

      {!hasAnyData && (
        <EmptyState
          icon={ListTodo}
          title="No entries yet"
          description="Add today's numbers below — campaign entries auto-fill spend from adsets."
        />
      )}

      {hasAnyData && (
        <AIDiagnosisPanel
          productId={productId}
          campaignId={campaignId}
          productName={product?.name ?? ''}
          campaignName={campaign.name}
          dateRange={range}
          input={input}
          ruleResult={result}
          profitBreakdown={profitBreakdown}
          adsetBreakdown={adsetBreakdown}
        />
      )}

      <details className="group rounded-lg border border-border bg-surface">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <ChevronDown className="size-4 text-text-muted transition-transform group-open:rotate-0 -rotate-90" />
          <h2 className="text-subheading text-text">Daily entries</h2>
        </summary>
        <div className="border-t border-border-subtle p-4">
          <CampaignEntriesTable
            entries={entries}
            adsetSpendByDate={adsetSpendByDate}
            targetCPA={targetCPA}
            timezone={getBrowserTimezone()}
            productFees={fees}
            onSaveEntry={saveEntry}
            onDeleteEntry={deleteEntry}
          />
        </div>
      </details>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-subheading text-text">Adsets</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setNewAdsetOpen(true)}
          >
            <Plus className="size-4" />
            New adset
          </Button>
        </div>
        {adsets.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No adsets in this campaign"
            description="Add adsets to auto-fill campaign spend from their daily numbers."
            action={
              <Button type="button" onClick={() => setNewAdsetOpen(true)}>
                <Plus className="size-4" />
                Create your first adset
              </Button>
            }
          />
        ) : (
          <AdsetAccordion
            productId={productId}
            campaignId={campaignId}
            productName={product?.name ?? ''}
            adsets={adsets}
            range={range}
            onConfirmDelete={handleDeleteAdset}
            onEdit={handleEditAdset}
            onStatusChange={handleAdsetStatusChange}
          />
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <SpendVsRevenueChart entries={entries} fromDate={fromDate} toDate={today} />
        <CPATrendChart
          entries={entries}
          targetCPA={targetCPA}
          fromDate={fromDate}
          toDate={today}
        />
      </section>

      <AdsetTrendChart
        adsets={adsets}
        byAdsetId={byAdsetId}
        fromDate={fromDate}
        toDate={today}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete "${campaign.name}"?`}
        description="This will permanently delete the campaign, its adsets, and every daily entry."
        onConfirm={handleDeleteCampaign}
      />

      <ConfirmDialog
        open={pendingKill !== null}
        onOpenChange={(o) => !o && setPendingKill(null)}
        title="Kill this campaign?"
        description="Status changes to killed. You can revert later — this does not delete data."
        confirmLabel="Kill"
        onConfirm={handleConfirmKill}
      />

      <NewAdsetDialog
        open={newAdsetOpen}
        onOpenChange={setNewAdsetOpen}
        productName={product?.name ?? ''}
        onSubmit={handleCreateAdset}
      />

      <EditCampaignDialog
        open={editCampaignOpen}
        onOpenChange={setEditCampaignOpen}
        campaign={campaign}
        onSubmit={handleEditCampaign}
      />
    </section>
  );
}
