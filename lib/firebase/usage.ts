import 'server-only';
import { adminDb } from './admin';
import { paths } from './paths';
import { todayInTimezone } from '@/lib/utils/date';

export const DAILY_DIAGNOSIS_LIMIT = 5;

export interface UsageResult {
  allowed: boolean;
  used: number;
  remaining: number;
  limit: number;
}

export async function checkAndIncrementUsage(uid: string): Promise<UsageResult> {
  const userRef = adminDb.doc(paths.user(uid));

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) {
      throw new Error(`User ${uid} not found`);
    }
    const data = snap.data() ?? {};
    const tz = (data.timezone as string | undefined) ?? 'UTC';
    const today = todayInTimezone(tz);

    const sameDay = data.diagnosesResetDate === today;
    const used = sameDay ? Number(data.diagnosesUsedToday ?? 0) : 0;

    if (used >= DAILY_DIAGNOSIS_LIMIT) {
      return {
        allowed: false,
        used,
        remaining: 0,
        limit: DAILY_DIAGNOSIS_LIMIT,
      };
    }

    const nextUsed = used + 1;
    tx.update(userRef, {
      diagnosesUsedToday: nextUsed,
      diagnosesResetDate: today,
    });

    return {
      allowed: true,
      used: nextUsed,
      remaining: DAILY_DIAGNOSIS_LIMIT - nextUsed,
      limit: DAILY_DIAGNOSIS_LIMIT,
    };
  });
}
