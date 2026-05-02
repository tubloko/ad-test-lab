/**
 * IC% relative to landing-page views (used in adset display).
 * The verdict engine uses {@link icRate} (IC/ATC) — keep that for rule
 * logic; use this one for tables and charts where the user wants
 * everything relative to LPV.
 */
export function icFromLPV(ic: number, lpv: number): number {
  if (lpv <= 0) return 0;
  return (ic / lpv) * 100;
}
