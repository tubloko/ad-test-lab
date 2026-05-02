'use client';

import { useMemo } from 'react';
import { collection, query, orderBy, type FirestoreError } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '@/lib/firebase/config';
import { paths } from '@/lib/firebase/paths';
import { toCampaignEntry } from '@/lib/firebase/converters';
import { useUser } from './useUser';
import { useAdsets } from './useAdsets';
import { useAllAdsetEntries } from './useAllAdsetEntries';
import type { CampaignEntry } from '@/types/entry';

export interface EnrichedCampaignEntry extends CampaignEntry {
  /** Spend value to render in the UI. */
  displayedSpend: number;
  /** Spend value to feed into verdict aggregation. */
  effectiveSpend: number;
  /** Sum of adset spends for this date, regardless of override. Surfaced
   *  so the UI can show "auto-fill: $X" hints next to an overridden row. */
  adsetSpendSum: number;
}

interface CampaignEntriesResult {
  data: EnrichedCampaignEntry[];
  /** Sum of adset spend for every date with adset data, regardless of
   *  whether a campaign entry exists for that date. The table uses this
   *  for the auto-fill spend on rows that don't yet have a saved entry. */
  adsetSpendByDate: Map<string, number>;
  loading: boolean;
  error: FirestoreError | undefined;
}

export function useCampaignEntries(
  productId: string | undefined,
  campaignId: string | undefined,
): CampaignEntriesResult {
  const { data: user } = useUser();

  const q =
    user && productId && campaignId
      ? query(
          collection(db, paths.campaignEntries(user.uid, productId, campaignId)),
          orderBy('date', 'desc'),
        )
      : null;

  const [snap, loadingEntries, error] = useCollection(q);

  const { data: adsets, loading: loadingAdsets } = useAdsets(productId, campaignId);
  const adsetIds = useMemo(() => adsets.map((a) => a.id), [adsets]);
  const { byAdsetId } = useAllAdsetEntries(productId, campaignId, adsetIds);

  const adsetSumByDate = useMemo(() => {
    const out = new Map<string, number>();
    for (const id of adsetIds) {
      for (const e of byAdsetId[id] ?? []) {
        out.set(e.date, (out.get(e.date) ?? 0) + e.spend);
      }
    }
    return out;
  }, [adsetIds, byAdsetId]);

  const data = useMemo<EnrichedCampaignEntry[]>(() => {
    if (!user || !productId || !campaignId) return [];
    const docs = snap?.docs ?? [];
    return docs.map((d) => {
      const entry = toCampaignEntry({ id: d.id, ...d.data() });
      const adsetSpendSum = adsetSumByDate.get(entry.date) ?? 0;
      // Adsets are the source of truth for spend. The stored entry.spend
      // and entry.spendOverride are deprecated and ignored.
      return {
        ...entry,
        adsetSpendSum,
        displayedSpend: adsetSpendSum,
        effectiveSpend: adsetSpendSum,
      };
    });
  }, [user, productId, campaignId, snap, adsetSumByDate]);

  if (!user || !productId || !campaignId) {
    return { data: [], adsetSpendByDate: new Map(), loading: false, error: undefined };
  }

  return {
    data,
    adsetSpendByDate: adsetSumByDate,
    loading: loadingEntries || loadingAdsets,
    error,
  };
}
