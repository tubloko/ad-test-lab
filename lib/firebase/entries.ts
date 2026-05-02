import { doc, deleteDoc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import { paths } from './paths';
import type { CampaignEntryInput, AdsetEntryInput } from '@/types/entry';

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(obj) as (keyof T)[]) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

async function upsertWithCreatedAt(
  refPath: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const ref = doc(db, refPath);
  const snap = await getDoc(ref);
  await setDoc(
    ref,
    {
      ...stripUndefined(payload),
      updatedAt: serverTimestamp(),
      ...(snap.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true },
  );
}

/**
 * Upsert a campaign daily entry. The caller is responsible for passing
 * `spendOverride` explicitly: `true` when the user manually edited the
 * spend column, `false` when the spend value is just the auto-fill
 * cache. No magic on this side.
 */
export async function upsertCampaignEntry(
  uid: string,
  productId: string,
  campaignId: string,
  date: string,
  data: CampaignEntryInput,
): Promise<void> {
  await upsertWithCreatedAt(
    paths.campaignEntry(uid, productId, campaignId, date),
    { ...data, date },
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
