'use client';

import { useMemo } from 'react';
import {
  aggregateProductEntries,
  aggregateAdsetEntries,
  mergeForVerdict,
  type DateRange,
  type ProductAggregate,
} from '@/lib/metrics/aggregate';
import { getVerdict, type VerdictResult } from '@/lib/verdict-engine';
import type { ProductEntry, AdsetEntry } from '@/types/entry';

interface UseVerdictArgs {
  productEntries: ProductEntry[];
  adsetEntries: AdsetEntry[][];
  targetCPA: number;
  range: DateRange;
}

interface VerdictBundle {
  result: VerdictResult;
  product: ProductAggregate;
}

export function useVerdict({
  productEntries,
  adsetEntries,
  targetCPA,
  range,
}: UseVerdictArgs): VerdictBundle {
  return useMemo(() => {
    const product = aggregateProductEntries(productEntries, range);
    const adsetAggs = adsetEntries.map((entries) => aggregateAdsetEntries(entries, range));
    const input = mergeForVerdict(product, adsetAggs, targetCPA);
    const result = getVerdict(input);
    return { result, product };
  }, [productEntries, adsetEntries, targetCPA, range]);
}
