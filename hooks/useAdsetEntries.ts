'use client';

import { collection, query, orderBy, type FirestoreError } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '@/lib/firebase/config';
import { paths } from '@/lib/firebase/paths';
import { toAdsetEntry } from '@/lib/firebase/converters';
import { useUser } from './useUser';
import type { AdsetEntry } from '@/types/entry';

interface AdsetEntriesResult {
  data: AdsetEntry[];
  loading: boolean;
  error: FirestoreError | undefined;
}

export function useAdsetEntries(
  productId: string | undefined,
  adsetId: string | undefined
): AdsetEntriesResult {
  const { data: user } = useUser();
  const q =
    user && productId && adsetId
      ? query(
          collection(db, paths.adsetEntries(user.uid, productId, adsetId)),
          orderBy('date', 'desc')
        )
      : null;

  const [snap, loading, error] = useCollection(q);

  if (!user || !productId || !adsetId) {
    return { data: [], loading: false, error: undefined };
  }

  const data = (snap?.docs ?? []).map((d) => toAdsetEntry({ id: d.id, ...d.data() }));
  return { data, loading, error };
}
