'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from './ConfirmDialog';
import { StatusMenu } from './StatusMenu';
import { VerdictBadge } from '@/components/verdict/VerdictBadge';
import { EditCampaignDialog } from '@/components/forms/EditCampaignDialog';
import { useCampaignEntries } from '@/hooks/useCampaignEntries';
import { useAdsets } from '@/hooks/useAdsets';
import { useAllAdsetEntries } from '@/hooks/useAllAdsetEntries';
import { useVerdict } from '@/hooks/useVerdict';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { cpaTone, profitTone, TONE_TEXT_CLASS } from '@/lib/utils/threshold-color';
import {
  CAMPAIGN_TRANSITIONS,
  type Campaign,
  type CampaignInput,
  type CampaignStatus,
} from '@/types/campaign';
import type { ProductFees } from '@/types/product';

interface CampaignCardProps {
  productId: string;
  campaign: Campaign;
  targetCPA: number;
  fees?: ProductFees;
  onDelete: (id: string) => Promise<void> | void;
  onEdit: (id: string, data: CampaignInput) => Promise<void>;
  onStatusChange: (id: string, status: CampaignStatus) => Promise<void>;
}

const ALL_TIME = { from: null as string | null, to: '2099-12-31' };

export function CampaignCard({
  productId,
  campaign,
  targetCPA,
  fees,
  onDelete,
  onEdit,
  onStatusChange,
}: CampaignCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pendingKill, setPendingKill] = useState<CampaignStatus | null>(null);

  const handleStatusChange = async (next: CampaignStatus) => {
    if (next === 'killed') {
      setPendingKill(next);
      return;
    }
    await onStatusChange(campaign.id, next);
  };

  const handleConfirmKill = async () => {
    if (!pendingKill) return;
    await onStatusChange(campaign.id, pendingKill);
    setPendingKill(null);
  };

  const { data: entries } = useCampaignEntries(productId, campaign.id);
  const { data: adsets } = useAdsets(productId, campaign.id);
  const adsetIds = useMemo(() => adsets.map((a) => a.id), [adsets]);
  const { byAdsetId } = useAllAdsetEntries(productId, campaign.id, adsetIds);
  const adsetEntries = useMemo(
    () => adsetIds.map((id) => byAdsetId[id] ?? []),
    [adsetIds, byAdsetId],
  );

  const { result, input } = useVerdict({
    campaignEntries: entries,
    adsetEntries,
    targetCPA,
    range: ALL_TIME,
    fees,
  });

  const cpa = result.metrics.cpa;
  const profit = result.metrics.profit;

  return (
    <Card className="flex-row items-stretch justify-between gap-4 overflow-visible">
      <Link
        href={`/products/${productId}/campaigns/${campaign.id}`}
        className="flex flex-1 min-w-0 flex-col gap-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-subheading text-text">{campaign.name}</p>
          <StatusMenu
            status={campaign.status}
            options={CAMPAIGN_TRANSITIONS[campaign.status]}
            onChange={handleStatusChange}
          />
          <VerdictBadge verdict={result.verdict} size="sm" />
        </div>

        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-caption text-text-muted">
          <span>
            CPA{' '}
            <span
              className={`text-mono ${input.totalOrders > 0 ? TONE_TEXT_CLASS[cpaTone(cpa, targetCPA)] : 'text-text-muted'}`}
            >
              {input.totalOrders > 0 ? formatCurrency(cpa) : '—'}
            </span>
          </span>
          <span>
            Profit{' '}
            <span className={`text-mono ${TONE_TEXT_CLASS[profitTone(profit)]}`}>
              {formatCurrency(profit)}
            </span>
          </span>
          <span>
            Spend <span className="text-mono text-text">{formatCurrency(input.totalSpend)}</span>
          </span>
          <span>
            {input.daysActive} {input.daysActive === 1 ? 'day' : 'days'}
          </span>
        </div>
      </Link>

      <div className="flex shrink-0 items-start gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Edit campaign"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Delete campaign"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete "${campaign.name}"?`}
        description="This will permanently delete the campaign, its adsets, and every daily entry under it."
        onConfirm={() => onDelete(campaign.id)}
      />

      <ConfirmDialog
        open={pendingKill !== null}
        onOpenChange={(o) => !o && setPendingKill(null)}
        title="Kill this campaign?"
        description="Status changes to killed. You can revert later — this does not delete data."
        confirmLabel="Kill"
        onConfirm={handleConfirmKill}
      />

      <EditCampaignDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        campaign={campaign}
        onSubmit={(data) => onEdit(campaign.id, data)}
      />
    </Card>
  );
}
