'use client';

import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EntriesToggleButtonProps {
  expanded: boolean;
  historicalCount: number;
  onToggle: () => void;
}

export function EntriesToggleButton({
  expanded,
  historicalCount,
  onToggle,
}: EntriesToggleButtonProps) {
  if (historicalCount === 0) return null;
  const noun = historicalCount === 1 ? 'day' : 'days';
  const label = `${historicalCount} ${noun}`;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-expanded={expanded}
      aria-label={`${expanded ? 'Hide' : 'Show'} ${historicalCount} historical ${noun}`}
      onClick={onToggle}
    >
      <ChevronDown
        className={cn(
          'size-4 transition-transform duration-200 ease-out',
          expanded ? 'rotate-0' : '-rotate-90',
        )}
      />
      {expanded ? 'Hide' : 'Show'} {label}
    </Button>
  );
}
