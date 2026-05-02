'use client';

import { collection, query, orderBy, type FirestoreError } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '@/lib/firebase/config';
import { paths } from '@/lib/firebase/paths';
import { toCampaign } from '@/lib/firebase/converters';
import { useUser } from './useUser';
import type { Campaign } from '@/types/campaign';

interface CampaignsResult {
  data: Campaign[];
  loading: boolean;
  error: FirestoreError | undefined;
}

export function useCampaigns(productId: string | undefined): CampaignsResult {
  const { data: user } = useUser();
  const q =
    user && productId
      ? query(
          collection(db, paths.campaigns(user.uid, productId)),
          orderBy('createdAt', 'desc'),
        )
      : null;

  const [snap, loading, error] = useCollection(q);

  if (!user || !productId) return { data: [], loading: false, error: undefined };

  const data = (snap?.docs ?? []).map((d) => toCampaign({ id: d.id, ...d.data() }));
  return { data, loading, error };
}
