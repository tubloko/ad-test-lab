import {
  doc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { paths } from './paths';
import { toProduct } from './converters';
import type { Product, ProductInput } from '@/types/product';

export async function createProduct(uid: string, input: ProductInput): Promise<string> {
  const ref = collection(db, paths.products(uid));
  const docRef = await addDoc(ref, {
    ...input,
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
  await updateDoc(ref, { ...input, updatedAt: serverTimestamp() });
}

// TODO: Firestore does not delete subcollections when a parent doc is deleted.
// Adsets, entries, and diagnoses under this product remain orphaned.
// Before launch, replace with a Cloud Function or batched recursive delete.
export async function deleteProduct(uid: string, productId: string): Promise<void> {
  const ref = doc(db, paths.product(uid, productId));
  await deleteDoc(ref);
}

export async function getProduct(uid: string, productId: string): Promise<Product | null> {
  const ref = doc(db, paths.product(uid, productId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toProduct({ id: snap.id, ...snap.data() });
}
