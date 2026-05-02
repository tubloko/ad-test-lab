import { doc, deleteDoc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import { paths } from './paths';
import type { CampaignEntryInput, AdsetEntryInput } from '@/types/entry';

async function upsertWithCreatedAt(
  refPath: string,
  payload: Record<string, unknown>,
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
    { merge: true },
  );
}

/**
 * Upsert a campaign daily entry. If the caller passes `spend`, treat it as
 * a manual edit and set spendOverride: true. Callers that are syncing the
 * auto-fill cache (writing the adset-summed spend) should pass an empty
 * data object or omit `spend` and call setSpendCache instead.
 */
export async function upsertCampaignEntry(
  uid: string,
  productId: string,
  campaignId: string,
  date: string,
  data: CampaignEntryInput,
): Promise<void> {
  const payload: Record<string, unknown> = { ...data, date };
  if (data.spend !== undefined && data.spendOverride === undefined) {
    payload.spendOverride = true;
  }
  await upsertWithCreatedAt(
    paths.campaignEntry(uid, productId, campaignId, date),
    payload,
  );
}

/**
 * Revert a campaign entry's spend back to auto-fill (sum of adsets).
 * Sets spendOverride to false; the displayed spend will be recomputed.
 */
export async function clearSpendOverride(
  uid: string,
  productId: string,
  campaignId: string,
  date: string,
): Promise<void> {
  const ref = doc(db, paths.campaignEntry(uid, productId, campaignId, date));
  await setDoc(
    ref,
    { spendOverride: false, date, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function upsertAdsetEntry(
  uid: string,
  productId: string,
  campaignId: string,
  adsetId: string,
  date: string,
  data: AdsetEntryInput,
): Promise<void> {
  await upsertWithCreatedAt(
    paths.adsetEntry(uid, productId, campaignId, adsetId, date),
    { ...data, date },
  );
}

export async function deleteCampaignEntry(
  uid: string,
  productId: string,
  campaignId: string,
  date: string,
): Promise<void> {
  const ref = doc(db, paths.campaignEntry(uid, productId, campaignId, date));
  await deleteDoc(ref);
}

export async function deleteAdsetEntry(
  uid: string,
  productId: string,
  campaignId: string,
  adsetId: string,
  date: string,
): Promise<void> {
  const ref = doc(
    db,
    paths.adsetEntry(uid, productId, campaignId, adsetId, date),
  );
  await deleteDoc(ref);
}
