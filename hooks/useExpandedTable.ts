'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  EXPANDED_PARAM,
  isExpanded,
  withExpanded,
} from '@/lib/utils/expandedTables';

export interface ExpandedTableState {
  expanded: boolean;
  setExpanded: (next: boolean) => void;
  toggle: () => void;
}

export function useExpandedTable(storageKey: string): ExpandedTableState {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const raw = search.get(EXPANDED_PARAM);
  const expanded = isExpanded(raw, storageKey);

  const setExpanded = useCallback(
    (next: boolean) => {
      const sp = new URLSearchParams(search.toString());
      const updated = withExpanded(sp.get(EXPANDED_PARAM), storageKey, next);
      if (updated === null) sp.delete(EXPANDED_PARAM);
      else sp.set(EXPANDED_PARAM, updated);
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, search, storageKey],
  );

  const toggle = useCallback(() => setExpanded(!expanded), [expanded, setExpanded]);

  return { expanded, setExpanded, toggle };
}
