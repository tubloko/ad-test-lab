import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './admin';

// Hard cap, ~10% buffer below the $20 Anthropic console limit so we
// stop charging users before the upstream provider stops us.
export const MONTHLY_BUDGET_USD = 18;

export function currentMonthKey(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function budgetRef(monthKey: string) {
  return adminDb.doc(`system/budget/months/${monthKey}`);
}

export async function getCurrentMonthSpend(): Promise<number> {
  const snap = await budgetRef(currentMonthKey()).get();
  if (!snap.exists) return 0;
  const data = snap.data() ?? {};
  return Number(data.spentUsd ?? 0);
}

export async function addToMonthlySpend(usd: number): Promise<{ totalSpentUsd: number }> {
  const monthKey = currentMonthKey();
  const ref = budgetRef(monthKey);
  await ref.set(
    {
      spentUsd: FieldValue.increment(usd),
      lastUpdatedAt: FieldValue.serverTimestamp(),
      monthKey,
    },
    { merge: true },
  );
  const fresh = await ref.get();
  return { totalSpentUsd: Number(fresh.data()?.spentUsd ?? 0) };
}

export async function isBudgetExceeded(): Promise<boolean> {
  const spent = await getCurrentMonthSpend();
  return spent >= MONTHLY_BUDGET_USD;
}
