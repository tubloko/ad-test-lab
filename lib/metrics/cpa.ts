export function cpa(spend: number, orders: number): number {
  if (orders <= 0) return 0;
  return spend / orders;
}
