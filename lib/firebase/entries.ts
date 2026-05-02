import { doc, deleteDoc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import { paths } from './paths';
import type { ProductEntryInput, AdsetEntryInput } from '@/types/entry';

async function upsertWithCreatedAt(
  refPath: string,
  payload: Record<string, unknown>
): Promise<void> {
  const ref = doc(db, refPath);
  const snap = await getDoc(ref);
  await setDoc(
    ref,
    {
      ...payload,
      updatedAt: serverTimestamp(),
      ...(snap.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true }
  );
}

export async function upsertProductEntry(
  uid: string,
  productId: string,
  date: string,
  data: ProductEntryInput
): Promise<void> {
  await upsertWithCreatedAt(paths.productEntry(uid, productId, date), { ...data, date });
}

export async function upsertAdsetEntry(
  uid: string,
  productId: string,
  adsetId: string,
  date: string,
  data: AdsetEntryInput
): Promise<void> {
  await upsertWithCreatedAt(paths.adsetEntry(uid, productId, adsetId, date), {
    ...data,
    date,
  });
}

export async function deleteProductEntry(
  uid: string,
  productId: string,
  date: string
): Promise<void> {
  const ref = doc(db, paths.productEntry(uid, productId, date));
  await deleteDoc(ref);
}

export async function deleteAdsetEntry(
  uid: string,
  productId: string,
  adsetId: string,
  date: string
): Promise<void> {
  const ref = doc(db, paths.adsetEntry(uid, productId, adsetId, date));
  await deleteDoc(ref);
}
