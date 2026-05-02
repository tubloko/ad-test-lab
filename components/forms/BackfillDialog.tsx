'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDate } from '@/lib/utils/formatDate';
import { subtractDays, dateRangeInclusive } from '@/lib/utils/date';
import { cn } from '@/lib/utils';

interface BackfillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  today: string; // YYYY-MM-DD
  /**
   * Called with the chosen dates (oldest first). The caller handles
   * filtering existing rows + showing toasts.
   */
  onBackfill: (dates: string[]) => void;
}

const QUICK_PICKS = [3, 7, 14, 30] as const;
const MAX_DAYS = 90;

export function BackfillDialog({
  open,
  onOpenChange,
  today,
  onBackfill,
}: BackfillDialogProps) {
  const [days, setDays] = useState<number>(7);
  const [specificDate, setSpecificDate] = useState<string>('');

  const minSpecific = subtractDays(today, 365);
  const yesterday = subtractDays(today, 1);

  const clampedDays = Math.max(1, Math.min(MAX_DAYS, Math.floor(days || 0)));
  const specificDateValid = isValidDateInRange(specificDate, minSpecific, yesterday);
  const specificDates = specificDateValid
    ? dateRangeInclusive(specificDate, yesterday)
    : [];

  const handleConfirmDays = () => {
    if (!Number.isFinite(days) || days < 1) return;
    // today-1 .. today-N → list oldest-first
    const dates: string[] = [];
    for (let i = clampedDays; i >= 1; i--) dates.push(subtractDays(today, i));
    onBackfill(dates);
  };

  const handleConfirmSpecific = () => {
    if (!specificDateValid) return;
    onBackfill(specificDates);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Backfill past days</DialogTitle>
          <DialogDescription>
            Add empty rows for past dates so you can fill in historical numbers.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="days">
          <TabsList className="w-full">
            <TabsTrigger value="days" className="flex-1">
              Number of days
            </TabsTrigger>
            <TabsTrigger value="specific" className="flex-1">
              Specific date
            </TabsTrigger>
          </TabsList>

          <TabsContent value="days" className="space-y-4 pt-4">
            <div>
              <Label className="mb-2 block">Quick pick</Label>
              <div className="flex flex-wrap gap-2">
                {QUICK_PICKS.map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant={days === n ? 'default' : 'outline'}
                    size="sm"
                    className={cn('min-w-12', days === n && 'pointer-events-auto')}
                    onClick={() => setDays(n)}
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="backfillCustom">Custom (1–{MAX_DAYS})</Label>
              <Input
                id="backfillCustom"
                type="number"
                min={1}
                max={MAX_DAYS}
                step={1}
                value={Number.isFinite(days) ? days : ''}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setDays(Number.isFinite(v) ? v : 1);
                }}
                className="w-32"
              />
            </div>

            <Button type="button" onClick={handleConfirmDays} disabled={days < 1}>
              Add {clampedDays} {clampedDays === 1 ? 'row' : 'rows'}
            </Button>
          </TabsContent>

          <TabsContent value="specific" className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="backfillSpecific">Start date</Label>
              <Input
                id="backfillSpecific"
                type="date"
                min={minSpecific}
                max={yesterday}
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="w-44"
              />
              <p className="text-caption text-text-muted">
                Adds a row for every date from your start date through yesterday.
                Up to 365 days back.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleConfirmSpecific}
              disabled={!specificDateValid}
            >
              {specificDateValid
                ? `Add ${specificDates.length} ${
                    specificDates.length === 1 ? 'row' : 'rows'
                  } from ${formatDate(specificDate)}`
                : 'Pick a start date'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function isValidDateInRange(d: string, min: string, max: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  return d >= min && d <= max;
}
