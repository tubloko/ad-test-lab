import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { db } from './config';
import { paths } from './paths';
import { todayInTimezone, getBrowserTimezone } from '@/lib/utils/date';

function deriveDisplayName(user: FirebaseUser): string {
  if (user.displayName?.trim()) return user.displayName;
  const localPart = user.email?.split('@')[0];
  return localPart && localPart.length > 0 ? localPart : 'User';
}

export async function ensureUserDocument(user: FirebaseUser): Promise<void> {
  const ref = doc(db, paths.user(user.uid));
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  const timezone = getBrowserTimezone();

  await setDoc(ref, {
    uid: user.uid,
    email: user.email ?? '',
    displayName: deriveDisplayName(user),
    timezone,
    plan: 'free',
    diagnosesUsedToday: 0,
    diagnosesResetDate: todayInTimezone(timezone),
    createdAt: serverTimestamp(),
  });
}
