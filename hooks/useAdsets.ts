'use client';

import { collection, query, orderBy, type FirestoreError } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '@/lib/firebase/config';
import { paths } from '@/lib/firebase/paths';
import { toAdset } from '@/lib/firebase/converters';
import { useUser } from './useUser';
import type { Adset } from '@/types/adset';

interface AdsetsResult {
  data: Adset[];
  loading: boolean;
  error: FirestoreError | undefined;
}

export function useAdsets(productId: string | undefined): AdsetsResult {
  const { data: user } = useUser();
  const q =
    user && productId
      ? query(
          collection(db, paths.adsets(user.uid, productId)),
          orderBy('createdAt', 'desc')
        )
      : null;

  const [snap, loading, error] = useCollection(q);

  if (!user || !productId) return { data: [], loading: false, error: undefined };

  const data = (snap?.docs ?? []).map((d) => toAdset({ id: d.id, ...d.data() }));
  return { data, loading, error };
}
