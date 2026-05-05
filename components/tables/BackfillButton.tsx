'use client';

import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BackfillButtonProps {
  onClick: () => void;
}

export function BackfillButton({ onClick }: BackfillButtonProps) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      <CalendarPlus className="size-4" />
      Backfill
    </Button>
  );
}
