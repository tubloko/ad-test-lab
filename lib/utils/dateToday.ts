// 'en-CA' formats as YYYY-MM-DD; the timeZone option converts the instant
// to the user's local calendar day before formatting.
export function todayInTZ(timezone: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: timezone });
}
