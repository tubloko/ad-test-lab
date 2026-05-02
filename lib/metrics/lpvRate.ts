export function lpvRate(lpv: number, clicks: number): number {
  if (clicks <= 0) return 0;
  return (lpv / clicks) * 100;
}
