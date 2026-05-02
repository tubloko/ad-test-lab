// 'en-CA' formats as YYYY-MM-DD; the timeZone option converts the instant
// to the user's local calendar day before formatting.
export function todayInTimezone(timezone: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: timezone });
}

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Subtract one day from a "YYYY-MM-DD" string. */
export function dayBefore(yyyymmdd: string): string {
  return subtractDays(yyyymmdd, 1);
}

/** Subtract N days from a "YYYY-MM-DD" string (UTC-stable). */
export function subtractDays(yyyymmdd: string, n: number): string {
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - n);
  return dt.toISOString().slice(0, 10);
}
