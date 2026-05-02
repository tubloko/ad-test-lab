'use client';

import { useCallback } from 'react';
import {
  upsertCampaignEntry,
  clearSpendOverride,
  deleteCampaignEntry,
} from '@/lib/firebase/entries';
import { useUser } from './useUser';
import type { CampaignEntryInput } from '@/types/entry';

interface CampaignEntryMutations {
  saveEntry: (date: string, values: CampaignEntryInput) => Promise<void>;
  clearOverride: (date: string) => Promise<void>;
  deleteEntry: (date: string) => Promise<void>;
}

export function useCampaignEntryMutations(
  productId: string,
  campaignId: string,
): CampaignEntryMutations {
  const { data: user } = useUser();

  const saveEntry = useCallback(
    async (date: string, values: CampaignEntryInput) => {
      if (!user) throw new Error('Not authenticated');
      await upsertCampaignEntry(user.uid, productId, campaignId, date, values);
    },
    [user, productId, campaignId],
  );

  const clearOverride = useCallback(
    async (date: string) => {
      if (!user) throw new Error('Not authenticated');
      await clearSpendOverride(user.uid, productId, campaignId, date);
    },
    [user, productId, campaignId],
  );

  const deleteEntry = useCallback(
    async (date: string) => {
      if (!user) throw new Error('Not authenticated');
      await deleteCampaignEntry(user.uid, productId, campaignId, date);
    },
    [user, productId, campaignId],
  );

  return { saveEntry, clearOverride, deleteEntry };
}
