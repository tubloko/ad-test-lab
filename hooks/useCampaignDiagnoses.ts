'use client';

import { collection, query, orderBy, type FirestoreError } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '@/lib/firebase/config';
import { paths } from '@/lib/firebase/paths';
import { toDiagnosis } from '@/lib/firebase/converters';
import { useUser } from './useUser';
import type { Diagnosis } from '@/types/diagnosis';

interface CampaignDiagnosesResult {
  data: Diagnosis[];
  loading: boolean;
  error: FirestoreError | undefined;
}

/**
 * Live list of all diagnoses for a campaign, sorted newest-first.
 * onSnapshot keeps it in sync — when the API route writes a new doc,
 * the list updates automatically (no manual refetch needed).
 */
export function useCampaignDiagnoses(
  productId: string | undefined,
  campaignId: string | undefined,
): CampaignDiagnosesResult {
  const { data: user } = useUser();

  const q =
    user && productId && campaignId
      ? query(
          collection(db, paths.diagnoses(user.uid, productId, campaignId)),
          orderBy('createdAt', 'desc'),
        )
      : null;

  const [snap, loading, error] = useCollection(q);

  if (!user || !productId || !campaignId) {
    return { data: [], loading: false, error: undefined };
  }

  const data = (snap?.docs ?? []).map((d) => toDiagnosis({ id: d.id, ...d.data() }));
  return { data, loading, error };
}
