import {
  doc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { paths } from './paths';
import { toProduct } from './converters';
import { deleteCampaign } from './campaigns';
import type { Product, ProductInput } from '@/types/product';

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(obj) as (keyof T)[]) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

export async function createProduct(uid: string, input: ProductInput): Promise<string> {
  const ref = collection(db, paths.products(uid));
  const docRef = await addDoc(ref, {
    ...stripUndefined(input),
    status: input.status ?? 'testing',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateProduct(
  uid: string,
  productId: string,
  input: Partial<ProductInput>
): Promise<void> {
  const ref = doc(db, paths.product(uid, productId));
  await updateDoc(ref, {
    ...stripUndefined(input),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a product and every nested campaign (which itself recursively
 * cleans its adsets, entries, and diagnoses). The Firestore client SDK
 * has no native recursive delete, so we walk the tree.
 */
export async function deleteProduct(uid: string, productId: string): Promise<void> {
  const campaignsSnap = await getDocs(collection(db, paths.campaigns(uid, productId)));
  for (const c of campaignsSnap.docs) {
    await deleteCampaign(uid, productId, c.id);
  }
  await deleteDoc(doc(db, paths.product(uid, productId)));
}

export async function getProduct(uid: string, productId: string): Promise<Product | null> {
  const ref = doc(db, paths.product(uid, productId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toProduct({ id: snap.id, ...snap.data() });
}
