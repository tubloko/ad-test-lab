import {
  doc,
  collection,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { paths } from './paths';
import { toCampaign } from './converters';
import type { Campaign, CampaignInput } from '@/types/campaign';

export async function createCampaign(
  uid: string,
  productId: string,
  input: CampaignInput,
): Promise<string> {
  const ref = collection(db, paths.campaigns(uid, productId));
  const docRef = await addDoc(ref, {
    ...input,
    productId,
    status: input.status ?? 'testing',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateCampaign(
  uid: string,
  productId: string,
  campaignId: string,
  input: Partial<CampaignInput>,
): Promise<void> {
  const ref = doc(db, paths.campaign(uid, productId, campaignId));
  await updateDoc(ref, { ...input, updatedAt: serverTimestamp() });
}

export async function getCampaign(
  uid: string,
  productId: string,
  campaignId: string,
): Promise<Campaign | null> {
  const ref = doc(db, paths.campaign(uid, productId, campaignId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toCampaign({ id: snap.id, ...snap.data() });
}

/**
 * Deletes a campaign and ALL nested data (entries, adsets and their
 * entries, diagnoses) using batched writes. Client SDK has no native
 * recursive delete, so we walk the tree and batch in chunks of 400.
 */
export async function deleteCampaign(
  uid: string,
  productId: string,
  campaignId: string,
): Promise<void> {
  const refsToDelete: string[] = [];

  const entriesSnap = await getDocs(
    collection(db, paths.campaignEntries(uid, productId, campaignId)),
  );
  for (const d of entriesSnap.docs) refsToDelete.push(d.ref.path);

  const adsetsSnap = await getDocs(
    collection(db, paths.adsets(uid, productId, campaignId)),
  );
  for (const adsetDoc of adsetsSnap.docs) {
    const adsetEntries = await getDocs(
      collection(
        db,
        paths.adsetEntries(uid, productId, campaignId, adsetDoc.id),
      ),
    );
    for (const e of adsetEntries.docs) refsToDelete.push(e.ref.path);
    refsToDelete.push(adsetDoc.ref.path);
  }

  const diagnosesSnap = await getDocs(
    collection(db, paths.diagnoses(uid, productId, campaignId)),
  );
  for (const d of diagnosesSnap.docs) refsToDelete.push(d.ref.path);

  refsToDelete.push(paths.campaign(uid, productId, campaignId));

  const CHUNK = 400;
  for (let i = 0; i < refsToDelete.length; i += CHUNK) {
    const batch = writeBatch(db);
    for (const path of refsToDelete.slice(i, i + CHUNK)) {
      batch.delete(doc(db, path));
    }
    await batch.commit();
  }
}

