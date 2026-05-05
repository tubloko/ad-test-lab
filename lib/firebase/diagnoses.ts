import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import { paths } from './paths';
import { toDiagnosis } from './converters';
import type { Diagnosis } from '@/types/diagnosis';

// Diagnoses are keyed by a hash over the inputs that drive the
// diagnosis. Same inputs always return the same cached doc so the user
// isn't billed twice for the same question; any change to the inputs
// produces a new hash and a fresh run. The expiresAt field is kept for
// historical/admin use (e.g. retention sweeps) but no longer gates reads.
const RECORD_RETENTION_MS = 365 * 24 * 60 * 60 * 1000;

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

  // If multiple docs match the same hash (shouldn't happen normally),
  // prefer the most recently generated one.
  const docs = snap.docs.slice().sort((a, b) => {
    const ta =
      a.data().createdAt instanceof Timestamp
        ? (a.data().createdAt as Timestamp).toMillis()
        : 0;
    const tb =
      b.data().createdAt instanceof Timestamp
        ? (b.data().createdAt as Timestamp).toMillis()
        : 0;
    return tb - ta;
  });
  const docSnap = docs[0];
  const data = docSnap.data();
  return toDiagnosis({
    id: docSnap.id,
    ...data,
    createdAt: asDate(data.createdAt),
    expiresAt: asDate(data.expiresAt),
  });
}

export async function cacheDiagnosis(
  uid: string,
  input: CacheDiagnosisInput,
): Promise<Diagnosis> {
  const ref = adminDb.collection(
    paths.diagnoses(uid, input.productId, input.campaignId),
  );
  const now = Date.now();
  const expiresAt = Timestamp.fromMillis(now + RECORD_RETENTION_MS);
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
