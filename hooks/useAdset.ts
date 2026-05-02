'use client';

import { doc, type FirestoreError } from 'firebase/firestore';
import { useDocument } from 'react-firebase-hooks/firestore';
import { db } from '@/lib/firebase/config';
import { paths } from '@/lib/firebase/paths';
import { toAdset } from '@/lib/firebase/converters';
import { useUser } from './useUser';
import type { Adset } from '@/types/adset';

interface AdsetResult {
  data: Adset | null;
  loading: boolean;
  error: FirestoreError | undefined;
}

export function useAdset(
  productId: string | undefined,
  adsetId: string | undefined
): AdsetResult {
  const { data: user } = useUser();
  const ref =
    user && productId && adsetId
      ? doc(db, paths.adset(user.uid, productId, adsetId))
      : null;
  const [snap, loading, error] = useDocument(ref);

  if (!user || !productId || !adsetId) {
    return { data: null, loading: false, error: undefined };
  }
  if (!snap?.exists()) return { data: null, loading, error };

  return {
    data: toAdset({ id: snap.id, ...snap.data() }),
    loading,
    error,
  };
}
