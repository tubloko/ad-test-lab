import 'server-only';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

const existing = getApps();
const adminApp: App =
  existing.length > 0
    ? existing[0]!
    : initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });

export const adminAuth = getAdminAuth(adminApp);
export const adminDb = getAdminFirestore(adminApp);
