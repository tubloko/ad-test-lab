export function roas(revenue: number, spend: number): number {
  if (spend <= 0) return 0;
  return revenue / spend;
}
