---
name: adtestlab-firebase-patterns
description: Firebase patterns for AdTestLab — Auth, Firestore reads/writes, security rules, and the rules for organizing Firebase code. Use this skill whenever working with Firebase, Firestore, authentication, or anything in lib/firebase/, when designing data access, when the user mentions Firestore, auth, or security rules. Read alongside the architecture skill for the data model.
---

# AdTestLab Firebase Patterns

How we use Firebase. Consistency here prevents subtle data bugs.

## Configuration

Single config file. Initialize once.

```ts
// lib/firebase/config.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  // ... rest
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
```

**Never** call `initializeApp` outside this file. Always import `auth` and `db` from here.

## Path Conventions

Firestore paths get long. Centralize them.

```ts
// lib/firebase/paths.ts
export const paths = {
  user: (uid: string) => `users/${uid}`,
  products: (uid: string) => `users/${uid}/products`,
  product: (uid: string, productId: string) =>
    `users/${uid}/products/${productId}`,
  adsets: (uid: string, productId: string) =>
    `users/${uid}/products/${productId}/adsets`,
  adset: (uid: string, productId: string, adsetId: string) =>
    `users/${uid}/products/${productId}/adsets/${adsetId}`,
  productEntries: (uid: string, productId: string) =>
    `users/${uid}/products/${productId}/entries`,
  productEntry: (uid: string, productId: string, date: string) =>
    `users/${uid}/products/${productId}/entries/${date}`,
  adsetEntries: (uid: string, productId: string, adsetId: string) =>
    `users/${uid}/products/${productId}/adsets/${adsetId}/entries`,
  diagnoses: (uid: string, productId: string) =>
    `users/${uid}/products/${productId}/diagnoses`,
};
```

**Never construct paths inline.** Always import from `paths`. This is the single source of truth — change it once, fix everywhere.

## CRUD Helpers

Helpers in `lib/firebase/firestore-helpers.ts`. They are thin wrappers — no business logic.

```ts
// lib/firebase/products.ts
import { doc, collection, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import { paths } from './paths';
import type { ProductInput, Product } from '@/types/product';

export async function createProduct(uid: string, input: ProductInput): Promise<string> {
  const ref = collection(db, paths.products(uid));
  const docRef = await addDoc(ref, {
    ...input,
    status: 'testing',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateProduct(
  uid: string,
  productId: string,
  input: Partial<ProductInput>
): Promise<void> {
  const ref = doc(db, paths.product(uid, productId));
  await updateDoc(ref, { ...input, updatedAt: serverTimestamp() });
}

export async function deleteProduct(uid: string, productId: string): Promise<void> {
  const ref = doc(db, paths.product(uid, productId));
  await deleteDoc(ref);
}
```

**Rules:**
- One file per entity (`products.ts`, `adsets.ts`, `entries.ts`, `diagnoses.ts`)
- Each function takes `uid` as first arg explicitly — no global user state
- Functions return promises with the minimum useful data
- No queries inside React components, ever. Always go through these helpers (often via a hook).

## Read Patterns: Hooks Over Direct Calls

For React components, use `react-firebase-hooks`. They give you live updates for free.

```ts
// hooks/useProducts.ts
import { collection } from 'firebase/firestore';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { db } from '@/lib/firebase/config';
import { paths } from '@/lib/firebase/paths';
import { useUser } from './useUser';
import type { Product } from '@/types/product';

export function useProducts() {
  const user = useUser();
  const ref = user ? collection(db, paths.products(user.uid)) : null;
  const [data, loading, error] = useCollectionData(ref, { idField: 'id' });
  return {
    products: (data ?? []) as Product[],
    loading,
    error,
  };
}
```

**Use direct calls (`getDoc`, `getDocs`) only when:**
- Inside an event handler (one-shot read)
- Inside an API route
- Inside a non-React utility

## Date Document IDs (Critical)

Daily entries use `"YYYY-MM-DD"` as document ID. This makes upserts trivial:

```ts
// lib/firebase/entries.ts
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import { paths } from './paths';

export async function upsertProductEntry(
  uid: string,
  productId: string,
  date: string,        // "YYYY-MM-DD"
  data: ProductEntryInput
): Promise<void> {
  const ref = doc(db, paths.productEntry(uid, productId, date));
  await setDoc(
    ref,
    {
      ...data,
      date,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
```

`setDoc` with `merge: true` creates if missing, updates if exists. No "does it exist?" check needed.

## Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

**Why this is enough for MVP:**
- Users can only access their own subtree
- No cross-user data access possible
- Default deny for everything else

**When you'll need more:**
- Multi-user / teams (post-MVP)
- Public sharing (post-MVP)
- Server-only writes (e.g., usage counters from API routes — handle via Admin SDK)

## Auth Pattern

```ts
// lib/firebase/auth.ts
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from './config';

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
}

export async function signOutUser() {
  return await signOut(auth);
}
```

```ts
// hooks/useUser.ts
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase/config';

export function useUser() {
  const [user, loading, error] = useAuthState(auth);
  return user;  // null if not signed in
}
```

## Auth Guard for Pages

```tsx
// app/(app)/layout.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase/config';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading) return <FullPageSpinner />;
  if (!user) return null;

  return <>{children}</>;
}
```

## API Route Auth (Server-Side)

For `/api/diagnose`, verify the Firebase ID token using Admin SDK.

```ts
// lib/firebase/admin.ts
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let adminApp: App;

if (!getApps().length) {
  adminApp = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const adminAuth = getAuth();
```

```ts
// In API route:
const token = req.headers.get('authorization')?.replace('Bearer ', '');
if (!token) return new Response('Unauthorized', { status: 401 });

const decoded = await adminAuth.verifyIdToken(token);
const uid = decoded.uid;
```

## Common Mistakes to Avoid

❌ **Storing computed values in Firestore.** CPA, ROAS, CTR — never. Compute on read.

❌ **Querying inside `.tsx` files.** Always go through a hook or helper.

❌ **Using string concatenation for paths.** Use `paths.*`.

❌ **Forgetting `serverTimestamp()`.** Don't use `new Date()` for `createdAt` — clocks lie. Use `serverTimestamp()`.

❌ **Updating `updatedAt` manually in components.** Always update inside the helper.

❌ **Reading the whole product when you need one field.** Generally fine because of caching, but for hot paths consider field selection.

❌ **Not handling the `null` user.** Every Firestore call assumes auth — guard before calling.

## Timestamps in TypeScript

Firestore returns `Timestamp` objects, not `Date`. Convert at the boundary.

```ts
import { Timestamp } from 'firebase/firestore';

interface ProductRaw {
  createdAt: Timestamp;
  // ...
}

interface Product {
  createdAt: Date;
  // ...
}

function toProduct(raw: ProductRaw): Product {
  return {
    ...raw,
    createdAt: raw.createdAt.toDate(),
  };
}
```

Place these converters in `lib/firebase/converters.ts`.
