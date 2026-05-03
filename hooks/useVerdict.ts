'use client';

import { useMemo } from 'react';
import {
  aggregateCampaignForVerdict,
  type DateRange,
} from '@/lib/metrics/aggregate';
import {
  getVerdict,
  type VerdictResult,
  type VerdictInput,
} from '@/lib/verdict-engine';
import type { CampaignEntry, AdsetEntry } from '@/types/entry';
import type { ProductFees } from '@/types/product';

interface UseVerdictArgs {
  campaignEntries: CampaignEntry[];
  adsetEntries: AdsetEntry[][];
  targetCPA: number;
  range: DateRange;
  fees?: ProductFees;
}

interface VerdictBundle {
  result: VerdictResult;
  input: VerdictInput;
}

export function useVerdict({
  campaignEntries,
  adsetEntries,
  targetCPA,
  range,
  fees,
}: UseVerdictArgs): VerdictBundle {
  const feesKey =
    fees &&
    `${fees.transactionFeePercent ?? ''}|${fees.transactionFeeFixed ?? ''}|${fees.shippingCost ?? ''}|${fees.refundRate ?? ''}`;
  return useMemo(() => {
    const input = aggregateCampaignForVerdict(
      campaignEntries,
      adsetEntries,
      range,
      targetCPA,
      fees,
    );
    const result = getVerdict(input);
    return { result, input };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignEntries, adsetEntries, targetCPA, range, feesKey]);
}
