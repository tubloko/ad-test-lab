'use client';
import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem('theme') as Theme | null) ?? 'dark';
    setThemeState(stored);
    setMounted(true);
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
    localStorage.setItem('theme', next);
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(next);
  }

  function toggle() {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  return { theme, setTheme, toggle, mounted };
}
