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
