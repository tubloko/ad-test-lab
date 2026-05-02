'use client';

import {
  DATE_RANGE_PRESETS,
  type DateRangePreset,
} from '@/lib/utils/dateRange';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DateRangeSelectProps {
  preset: DateRangePreset;
  onPresetChange: (preset: DateRangePreset) => void;
}

export function DateRangeSelect({ preset, onPresetChange }: DateRangeSelectProps) {
  return (
    <Select
      value={preset}
      onValueChange={(v) => v && onPresetChange(v as DateRangePreset)}
    >
      <SelectTrigger size="sm" className="min-w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {DATE_RANGE_PRESETS.map((p) => (
          <SelectItem key={p.value} value={p.value}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
