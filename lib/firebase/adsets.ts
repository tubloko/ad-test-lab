import {
  doc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { paths } from './paths';
import type { AdsetInput } from '@/types/adset';

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(obj) as (keyof T)[]) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

export async function createAdset(
  uid: string,
  productId: string,
  campaignId: string,
  input: AdsetInput,
): Promise<string> {
  const ref = collection(db, paths.adsets(uid, productId, campaignId));
  const docRef = await addDoc(ref, {
    ...stripUndefined(input),
    productId,
    campaignId,
    status: input.status ?? 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateAdset(
  uid: string,
  productId: string,
  campaignId: string,
  adsetId: string,
  input: Partial<AdsetInput>,
): Promise<void> {
  const ref = doc(db, paths.adset(uid, productId, campaignId, adsetId));
  await updateDoc(ref, { ...stripUndefined(input), updatedAt: serverTimestamp() });
}

export async function deleteAdset(
  uid: string,
  productId: string,
  campaignId: string,
  adsetId: string,
): Promise<void> {
  const ref = doc(db, paths.adset(uid, productId, campaignId, adsetId));
  await deleteDoc(ref);
}
