'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type FirestoreError,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { paths } from '@/lib/firebase/paths';
import { toAdsetEntry } from '@/lib/firebase/converters';
import { useUser } from './useUser';
import type { AdsetEntry } from '@/types/entry';

interface AllAdsetEntriesResult {
  byAdsetId: Record<string, AdsetEntry[]>;
  error: FirestoreError | undefined;
}

export function useAllAdsetEntries(
  productId: string | undefined,
  adsetIds: string[],
): AllAdsetEntriesResult {
  const { data: user } = useUser();
  const [snapshots, setSnapshots] = useState<Record<string, AdsetEntry[]>>({});
  const [error, setError] = useState<FirestoreError | undefined>(undefined);

  const idsKey = useMemo(() => adsetIds.slice().sort().join(','), [adsetIds]);

  useEffect(() => {
    if (!user || !productId || idsKey === '') return;
    const ids = idsKey.split(',');
    const unsubs = ids.map((adsetId) => {
      const ref = collection(db, paths.adsetEntries(user.uid, productId, adsetId));
      return onSnapshot(
        query(ref, orderBy('date', 'desc')),
        (snap) => {
          const entries = snap.docs.map((d) => toAdsetEntry({ id: d.id, ...d.data() }));
          setSnapshots((prev) => ({ ...prev, [adsetId]: entries }));
        },
        setError,
      );
    });
    return () => unsubs.forEach((u) => u());
  }, [user, productId, idsKey]);

  const byAdsetId = useMemo(() => {
    const out: Record<string, AdsetEntry[]> = {};
    for (const id of adsetIds) out[id] = snapshots[id] ?? [];
    return out;
  }, [snapshots, adsetIds]);

  return { byAdsetId, error };
}
