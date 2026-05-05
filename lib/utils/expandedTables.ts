export const EXPANDED_PARAM = 'expanded';

export function parseExpanded(raw: string | null | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(raw.split(',').filter(Boolean));
}

export function serializeExpanded(set: Set<string>): string | null {
  if (set.size === 0) return null;
  return [...set].join(',');
}

export function withExpanded(
  raw: string | null | undefined,
  key: string,
  expanded: boolean,
): string | null {
  const next = parseExpanded(raw);
  if (expanded) next.add(key);
  else next.delete(key);
  return serializeExpanded(next);
}

export function isExpanded(
  raw: string | null | undefined,
  key: string,
): boolean {
  return parseExpanded(raw).has(key);
}
