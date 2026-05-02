export function atcRate(atc: number, lpv: number): number {
  if (lpv <= 0) return 0;
  return (atc / lpv) * 100;
}
