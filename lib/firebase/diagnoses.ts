import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import { paths } from './paths';
import { toDiagnosis } from './converters';
import type { Diagnosis } from '@/types/diagnosis';

const TTL_MS = 24 * 60 * 60 * 1000;

export interface CacheDiagnosisInput {
  productId: string;
  campaignId: string;
  inputHash: string;
  dateRange: { from: string; to: string };
  ruleVerdict: Diagnosis['ruleVerdict'];
  aiSummary: string;
  primaryIssue: string;
  recommendedAction: string;
  confidence: Diagnosis['confidence'];
}

function asDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(0);
}

export async function getCachedDiagnosis(
  uid: string,
  productId: string,
  campaignId: string,
  inputHash: string,
): Promise<Diagnosis | null> {
  const ref = adminDb.collection(paths.diagnoses(uid, productId, campaignId));
  const snap = await ref.where('inputHash', '==', inputHash).get();
  if (snap.empty) return null;

  const now = Date.now();
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const expiresMs =
      data.expiresAt instanceof Timestamp ? data.expiresAt.toMillis() : 0;
    if (expiresMs > now) {
      return toDiagnosis({
        id: docSnap.id,
        ...data,
        createdAt: asDate(data.createdAt),
        expiresAt: asDate(data.expiresAt),
      });
    }
  }
  return null;
}

export async function cacheDiagnosis(
  uid: string,
  input: CacheDiagnosisInput,
): Promise<Diagnosis> {
  const ref = adminDb.collection(
    paths.diagnoses(uid, input.productId, input.campaignId),
  );
  const now = Date.now();
  const expiresAt = Timestamp.fromMillis(now + TTL_MS);
  const createdAt = Timestamp.fromMillis(now);
  const docRef = await ref.add({
    ...input,
    createdAt,
    expiresAt,
  });
  return toDiagnosis({
    id: docRef.id,
    ...input,
    createdAt: createdAt.toDate(),
    expiresAt: expiresAt.toDate(),
  });
}
