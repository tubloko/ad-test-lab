'use client';

import { doc, type FirestoreError } from 'firebase/firestore';
import { useDocument } from 'react-firebase-hooks/firestore';
import { db } from '@/lib/firebase/config';
import { paths } from '@/lib/firebase/paths';
import { toProduct } from '@/lib/firebase/converters';
import { useUser } from './useUser';
import type { Product } from '@/types/product';

interface ProductResult {
  data: Product | null;
  loading: boolean;
  error: FirestoreError | undefined;
}

export function useProduct(productId: string | undefined): ProductResult {
  const { data: user } = useUser();
  const ref = user && productId ? doc(db, paths.product(user.uid, productId)) : null;
  const [snap, loading, error] = useDocument(ref);

  if (!user || !productId) return { data: null, loading: false, error: undefined };
  if (!snap?.exists()) return { data: null, loading, error };

  return {
    data: toProduct({ id: snap.id, ...snap.data() }),
    loading,
    error,
  };
}
