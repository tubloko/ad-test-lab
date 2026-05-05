'use client';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'sidebar:pinned';

export function useSidebarPin() {
  const [pinned, setPinned] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      try {
        setPinned(JSON.parse(raw) === true);
      } catch {
        setPinned(false);
      }
    }
    setMounted(true);
  }, []);

  function togglePin() {
    setPinned((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  return { pinned, togglePin, mounted };
}
