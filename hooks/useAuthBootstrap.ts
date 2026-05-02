'use client';

import { useEffect, useRef } from 'react';
import { ensureUserDocument } from '@/lib/firebase/users';
import { useUser } from './useUser';

export function useAuthBootstrap(): void {
  const { data: user } = useUser();
  const ranFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      ranFor.current = null;
      return;
    }
    if (ranFor.current === user.uid) return;
    ranFor.current = user.uid;

    ensureUserDocument(user).catch((err) => {
      // Allow retry on next mount / auth change.
      ranFor.current = null;
      console.error('Failed to provision user document', err);
    });
  }, [user]);
}
