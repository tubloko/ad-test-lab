'use client';

import { useCallback } from 'react';
import {
  upsertProductEntry,
  deleteProductEntry,
} from '@/lib/firebase/entries';
import { useUser } from './useUser';
import type { ProductEntryInput } from '@/types/entry';

interface ProductEntryMutations {
  saveEntry: (date: string, values: ProductEntryInput) => Promise<void>;
  deleteEntry: (date: string) => Promise<void>;
}

export function useProductEntryMutations(productId: string): ProductEntryMutations {
  const { data: user } = useUser();

  const saveEntry = useCallback(
    async (date: string, values: ProductEntryInput) => {
      if (!user) throw new Error('Not authenticated');
      await upsertProductEntry(user.uid, productId, date, values);
    },
    [user, productId],
  );

  const deleteEntry = useCallback(
    async (date: string) => {
      if (!user) throw new Error('Not authenticated');
      await deleteProductEntry(user.uid, productId, date);
    },
    [user, productId],
  );

  return { saveEntry, deleteEntry };
}
