export type DateRangePreset = '7d' | '14d' | '30d' | 'all';

export const DATE_RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '14d', label: 'Last 14 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
];

export function isDateRangePreset(value: string | null | undefined): value is DateRangePreset {
  return value === '7d' || value === '14d' || value === '30d' || value === 'all';
}

export function presetToDays(preset: DateRangePreset): number | null {
  if (preset === 'all') return null;
  if (preset === '7d') return 7;
  if (preset === '14d') return 14;
  return 30;
}

export function rangeStartDate(preset: DateRangePreset, today: string): string | null {
  const days = presetToDays(preset);
  if (days === null) return null;
  const [y, m, d] = today.split('-').map(Number);
  const ref = new Date(Date.UTC(y, m - 1, d));
  ref.setUTCDate(ref.getUTCDate() - (days - 1));
  return ref.toISOString().slice(0, 10);
}

export function isWithinRange(date: string, from: string | null, to: string): boolean {
  if (date > to) return false;
  if (from && date < from) return false;
  return true;
}
