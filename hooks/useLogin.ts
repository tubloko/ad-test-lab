'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FirebaseError } from 'firebase/app';
import {
  signInWithGoogle as fbSignInWithGoogle,
  signInWithEmail as fbSignInWithEmail,
} from '@/lib/firebase/auth';

interface UseLoginResult {
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
}

export function useLogin(redirectTo: string = '/'): UseLoginResult {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    setLoading(true);
    setError(null);
    try {
      await action();
      router.push(redirectTo);
    } catch (e) {
      const code = e instanceof FirebaseError ? e.code : '';
      const message = errorMessage(code);
      if (message) setError(message);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    signInWithGoogle: () => run(fbSignInWithGoogle),
    signInWithEmail: (email, password) =>
      run(() => fbSignInWithEmail(email, password)),
  };
}

function errorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return '';
    default:
      return 'Sign-in failed. Please try again.';
  }
}
