'use client';

import { useCallback } from 'react';
import {
  upsertAdsetEntry,
  deleteAdsetEntry,
} from '@/lib/firebase/entries';
import { useUser } from './useUser';
import type { AdsetEntryInput } from '@/types/entry';

interface AdsetEntryMutations {
  saveEntry: (date: string, values: AdsetEntryInput) => Promise<void>;
  deleteEntry: (date: string) => Promise<void>;
}

export function useAdsetEntryMutations(
  productId: string,
  adsetId: string,
): AdsetEntryMutations {
  const { data: user } = useUser();

  const saveEntry = useCallback(
    async (date: string, values: AdsetEntryInput) => {
      if (!user) throw new Error('Not authenticated');
      await upsertAdsetEntry(user.uid, productId, adsetId, date, values);
    },
    [user, productId, adsetId],
  );

  const deleteEntry = useCallback(
    async (date: string) => {
      if (!user) throw new Error('Not authenticated');
      await deleteAdsetEntry(user.uid, productId, adsetId, date);
    },
    [user, productId, adsetId],
  );

  return { saveEntry, deleteEntry };
}
