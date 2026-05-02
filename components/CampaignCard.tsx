'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { ConfirmDialog } from './ConfirmDialog';
import { StatusBadge } from './StatusBadge';
import { VerdictBadge } from '@/components/verdict/VerdictBadge';
import { useCampaignEntries } from '@/hooks/useCampaignEntries';
import { useAdsets } from '@/hooks/useAdsets';
import { useAllAdsetEntries } from '@/hooks/useAllAdsetEntries';
import { useVerdict } from '@/hooks/useVerdict';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { cpaTone, profitTone, TONE_TEXT_CLASS } from '@/lib/utils/threshold-color';
import type { Campaign } from '@/types/campaign';

interface CampaignCardProps {
  productId: string;
  campaign: Campaign;
  targetCPA: number;
  onDelete: (id: string) => Promise<void> | void;
}

const ALL_TIME = { from: null as string | null, to: '2099-12-31' };

export function CampaignCard({
  productId,
  campaign,
  targetCPA,
  onDelete,
}: CampaignCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

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
  });

  const cpa = result.metrics.cpa;
  const profit = result.metrics.profit;

  return (
    <Card className="flex-row items-stretch justify-between gap-4">
      <Link
        href={`/products/${productId}/campaigns/${campaign.id}`}
        className="flex flex-1 min-w-0 flex-col gap-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-subheading text-text">{campaign.name}</p>
          <StatusBadge status={campaign.status} />
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
        <Link
          href={`/products/${productId}/campaigns/${campaign.id}/edit`}
          aria-label="Edit campaign"
          className={buttonVariants({ variant: 'ghost', size: 'icon' })}
        >
          <Pencil className="size-4" />
        </Link>
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
    </Card>
  );
}
