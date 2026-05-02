const formatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function formatDate(input: string | Date): string {
  if (input instanceof Date) return formatter.format(input);
  // "YYYY-MM-DD" → parse as local date so we don't shift days across UTC.
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split('-').map(Number);
    return formatter.format(new Date(y, m - 1, d));
  }
  return formatter.format(new Date(input));
}
