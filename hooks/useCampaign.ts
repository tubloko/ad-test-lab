'use client';

import { doc, type FirestoreError } from 'firebase/firestore';
import { useDocument } from 'react-firebase-hooks/firestore';
import { db } from '@/lib/firebase/config';
import { paths } from '@/lib/firebase/paths';
import { toCampaign } from '@/lib/firebase/converters';
import { useUser } from './useUser';
import type { Campaign } from '@/types/campaign';

interface CampaignResult {
  data: Campaign | null;
  loading: boolean;
  error: FirestoreError | undefined;
}

export function useCampaign(
  productId: string | undefined,
  campaignId: string | undefined,
): CampaignResult {
  const { data: user } = useUser();
  const ref =
    user && productId && campaignId
      ? doc(db, paths.campaign(user.uid, productId, campaignId))
      : null;
  const [snap, loading, error] = useDocument(ref);

  if (!user || !productId || !campaignId) {
    return { data: null, loading: false, error: undefined };
  }
  if (!snap?.exists()) return { data: null, loading, error };

  return {
    data: toCampaign({ id: snap.id, ...snap.data() }),
    loading,
    error,
  };
}
