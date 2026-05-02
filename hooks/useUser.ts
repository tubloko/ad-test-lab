'use client';

import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase/config';
import type { User as FirebaseUser } from 'firebase/auth';

interface UserResult {
  data: FirebaseUser | null;
  loading: boolean;
  error: Error | undefined;
}

export function useUser(): UserResult {
  const [user, loading, error] = useAuthState(auth);
  return { data: user ?? null, loading, error };
}
