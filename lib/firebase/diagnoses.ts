import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { paths } from './paths';
import { toDiagnosis } from './converters';
import type { Diagnosis } from '@/types/diagnosis';

const TTL_MS = 24 * 60 * 60 * 1000;

export interface CacheDiagnosisInput {
  productId: string;
  inputHash: string;
  dateRange: { from: string; to: string };
  ruleVerdict: Diagnosis['ruleVerdict'];
  aiSummary: string;
  primaryIssue: string;
  recommendedAction: string;
  confidence: Diagnosis['confidence'];
}

export async function getCachedDiagnosis(
  uid: string,
  productId: string,
  inputHash: string
): Promise<Diagnosis | null> {
  const ref = collection(db, paths.diagnoses(uid, productId));
  const q = query(ref, where('inputHash', '==', inputHash));
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const now = Date.now();
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const expiresAt = data.expiresAt;
    const expiresMs =
      expiresAt instanceof Timestamp ? expiresAt.toMillis() : 0;
    if (expiresMs > now) {
      return toDiagnosis({ id: docSnap.id, ...data });
    }
  }
  return null;
}

export async function cacheDiagnosis(
  uid: string,
  input: CacheDiagnosisInput
): Promise<string> {
  const ref = collection(db, paths.diagnoses(uid, input.productId));
  const expiresAt = Timestamp.fromMillis(Date.now() + TTL_MS);
  const docRef = await addDoc(ref, {
    ...input,
    createdAt: serverTimestamp(),
    expiresAt,
  });
  return docRef.id;
}
