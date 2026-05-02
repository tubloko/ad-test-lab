import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from './config';
import { paths } from './paths';

/**
 * Sum of adset spends for a single date inside one campaign.
 *
 * One-shot read for non-React contexts (event handlers, API routes).
 * For React render paths, prefer joining `useAdsets` + `useAllAdsetEntries`
 * so updates stay live without re-querying.
 */
export async function getAdsetSpendForDate(
  uid: string,
  productId: string,
  campaignId: string,
  date: string,
): Promise<number> {
  const adsetsSnap = await getDocs(
    collection(db, paths.adsets(uid, productId, campaignId)),
  );
  if (adsetsSnap.empty) return 0;

  const reads = adsetsSnap.docs.map((adsetDoc) =>
    getDoc(
      doc(
        db,
        paths.adsetEntry(uid, productId, campaignId, adsetDoc.id, date),
      ),
    ),
  );
  const entries = await Promise.all(reads);

  let total = 0;
  for (const snap of entries) {
    if (!snap.exists()) continue;
    const v = snap.data().spend;
    if (typeof v === 'number') total += v;
  }
  return total;
}
