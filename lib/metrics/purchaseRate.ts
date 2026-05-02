export function purchaseRate(purchases: number, ic: number): number {
  if (ic <= 0) return 0;
  return (purchases / ic) * 100;
}
