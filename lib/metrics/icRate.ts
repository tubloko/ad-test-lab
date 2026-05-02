export function icRate(ic: number, atc: number): number {
  if (atc <= 0) return 0;
  return (ic / atc) * 100;
}
