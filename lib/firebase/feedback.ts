import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import type { FeedbackSubmitInput } from '@/types/feedback';

export async function saveFeedback(
  uid: string,
  userEmail: string,
  userName: string | undefined,
  input: FeedbackSubmitInput,
): Promise<string> {
  const ref = adminDb.collection('feedback').doc();
  await ref.set({
    ...input,
    uid,
    userEmail,
    userName: userName ?? null,
    status: 'new',
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}
