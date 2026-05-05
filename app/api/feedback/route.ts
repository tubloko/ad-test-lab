import { NextResponse, type NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { saveFeedback } from '@/lib/firebase/feedback';
import { sendFeedbackNotification } from '@/lib/email/feedbackNotification';
import { FeedbackSubmitSchema } from '@/types/feedback';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : '';
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let uid: string;
  let userEmail: string;
  let userName: string | undefined;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
    userEmail = decoded.email ?? '';
    userName = typeof decoded.name === 'string' ? decoded.name : undefined;
  } catch (err) {
    console.error('[feedback] token verification failed', err);
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let input: ReturnType<typeof FeedbackSubmitSchema.parse>;
  try {
    const json = await req.json();
    const parsed = FeedbackSubmitSchema.safeParse(json);
    if (!parsed.success) {
      console.error('[feedback] invalid body', { uid, issues: parsed.error.issues });
      return NextResponse.json(
        { error: 'bad_request', message: 'Invalid feedback.' },
        { status: 400 },
      );
    }
    input = parsed.data;
  } catch (err) {
    console.error('[feedback] body parse error', { uid, err });
    return NextResponse.json(
      { error: 'bad_request', message: 'Could not parse request body.' },
      { status: 400 },
    );
  }

  let id: string;
  try {
    id = await saveFeedback(uid, userEmail, userName, input);
  } catch (err) {
    console.error('[feedback] save failed', { uid, err });
    return NextResponse.json(
      { error: 'internal', message: 'Could not save feedback. Try again.' },
      { status: 500 },
    );
  }

  // Best-effort — never fails the request.
  try {
    await sendFeedbackNotification({
      id,
      type: input.type,
      message: input.message,
      context: input.context,
      pageUrl: input.pageUrl,
      userEmail,
      userName: userName ?? null,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('[feedback] notification dispatch threw', { uid, id, err });
  }

  return NextResponse.json({ id, message: 'Feedback received. Thanks!' });
}
