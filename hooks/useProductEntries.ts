'use client';

import { collection, query, orderBy, type FirestoreError } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '@/lib/firebase/config';
import { paths } from '@/lib/firebase/paths';
import { toProductEntry } from '@/lib/firebase/converters';
import { useUser } from './useUser';
import type { ProductEntry } from '@/types/entry';

interface ProductEntriesResult {
  data: ProductEntry[];
  loading: boolean;
  error: FirestoreError | undefined;
}

export function useProductEntries(productId: string | undefined): ProductEntriesResult {
  const { data: user } = useUser();
  const q =
    user && productId
      ? query(
          collection(db, paths.productEntries(user.uid, productId)),
          orderBy('date', 'desc')
        )
      : null;

  const [snap, loading, error] = useCollection(q);

  if (!user || !productId) return { data: [], loading: false, error: undefined };

  const data = (snap?.docs ?? []).map((d) => toProductEntry({ id: d.id, ...d.data() }));
  return { data, loading, error };
}
