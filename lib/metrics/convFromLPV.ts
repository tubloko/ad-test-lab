/**
 * Conversion rate relative to landing-page views (purchases / LPV).
 * Sibling of {@link icFromLPV}. The verdict engine still uses
 * {@link purchaseRate} (purchases / IC) for its rule thresholds.
 */
export function convFromLPV(purchases: number, lpv: number): number {
  if (lpv <= 0) return 0;
  return (purchases / lpv) * 100;
}
