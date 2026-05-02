'use client';

import { collection, query, orderBy, type FirestoreError } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '@/lib/firebase/config';
import { paths } from '@/lib/firebase/paths';
import { toProduct } from '@/lib/firebase/converters';
import { useUser } from './useUser';
import type { Product } from '@/types/product';

interface ProductsResult {
  data: Product[];
  loading: boolean;
  error: FirestoreError | undefined;
}

export function useProducts(): ProductsResult {
  const { data: user } = useUser();
  const q = user
    ? query(collection(db, paths.products(user.uid)), orderBy('createdAt', 'desc'))
    : null;

  const [snap, loading, error] = useCollection(q);

  if (!user) return { data: [], loading: false, error: undefined };

  const data = (snap?.docs ?? []).map((d) => toProduct({ id: d.id, ...d.data() }));
  return { data, loading, error };
}
