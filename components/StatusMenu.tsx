'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ProductStatus } from '@/types/product';
import type { AdsetStatus } from '@/types/adset';
import type { CampaignStatus } from '@/types/campaign';

type AnyStatus = ProductStatus | AdsetStatus | CampaignStatus;

const VARIANT: Record<AnyStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  testing: 'outline',
  scaled: 'default',
  active: 'default',
  paused: 'secondary',
  killed: 'destructive',
};

interface StatusMenuProps<T extends AnyStatus> {
  status: T;
  /** Allowed transitions excluding the current status. Empty list disables the trigger. */
  options: readonly T[];
  /**
   * Called with the picked status. May return a Promise; on rejection,
   * the menu surfaces a toast and does not pulse-confirm.
   */
  onChange: (next: T) => Promise<void> | void;
  disabled?: boolean;
}

/**
 * Inline status pill that opens a dropdown of valid transitions.
 *
 * Behaviour notes:
 *  - Stops click + keydown propagation on its container so it doesn't
 *    toggle parent disclosure widgets (accordion summary) or trigger
 *    parent links (CampaignCard's wrapping <Link>).
 *  - Optimistic: closes the menu and pulses the badge before the
 *    Firestore write completes. On error, the live snapshot will
 *    re-render the previous status; we also toast.
 */
export function StatusMenu<T extends AnyStatus>({
  status,
  options,
  onChange,
  disabled = false,
}: StatusMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouse(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handlePick = async (next: T) => {
    setOpen(false);
    setPulsing(true);
    try {
      await onChange(next);
      window.setTimeout(() => setPulsing(false), 250);
    } catch {
      setPulsing(false);
      toast.error("Couldn't update status");
    }
  };

  const noOptions = options.length === 0 || disabled;

  return (
    <div
      ref={containerRef}
      className="relative inline-flex"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        disabled={noOptions}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center"
      >
        <Badge
          variant={VARIANT[status]}
          className={cn(
            'gap-1 cursor-pointer',
            noOptions && 'cursor-default opacity-70',
            pulsing && 'animate-pulse',
          )}
        >
          {status}
          {!noOptions && (
            <ChevronDown
              className={cn(
                'size-3 transition-transform',
                open && 'rotate-180',
              )}
            />
          )}
        </Badge>
      </button>

      {open && !noOptions && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-30 mt-1 min-w-32 rounded-md border border-border bg-elevated p-1 shadow-md"
        >
          {options.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => void handlePick(opt)}
                className="flex w-full items-center rounded-sm px-2 py-1 text-left hover:bg-surface"
              >
                <Badge variant={VARIANT[opt]} className="pointer-events-none">
                  {opt}
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
