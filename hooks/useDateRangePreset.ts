'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  isDateRangePreset,
  type DateRangePreset,
} from '@/lib/utils/dateRange';

interface DateRangePresetResult {
  preset: DateRangePreset;
  setPreset: (preset: DateRangePreset) => void;
}

export function useDateRangePreset(
  defaultPreset: DateRangePreset = '14d',
  paramKey = 'range',
): DateRangePresetResult {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const raw = params.get(paramKey);
  const preset: DateRangePreset = isDateRangePreset(raw) ? raw : defaultPreset;

  const setPreset = useCallback(
    (next: DateRangePreset) => {
      const sp = new URLSearchParams(params.toString());
      if (next === defaultPreset) sp.delete(paramKey);
      else sp.set(paramKey, next);
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, params, defaultPreset, paramKey],
  );

  return { preset, setPreset };
}
