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

interface UseVerdictArgs {
  campaignEntries: CampaignEntry[];
  adsetEntries: AdsetEntry[][];
  targetCPA: number;
  range: DateRange;
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
}: UseVerdictArgs): VerdictBundle {
  return useMemo(() => {
    const input = aggregateCampaignForVerdict(
      campaignEntries,
      adsetEntries,
      range,
      targetCPA,
    );
    const result = getVerdict(input);
    return { result, input };
  }, [campaignEntries, adsetEntries, targetCPA, range]);
}
