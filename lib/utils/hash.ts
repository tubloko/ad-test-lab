import { createHash } from 'node:crypto';

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  // Skip undefined-valued keys to match JSON.stringify, so a hash
  // computed locally agrees with one computed after a JSON round-trip
  // through the API. Without this, an optional field present-but-undefined
  // on the client diverges from the same field absent on the server.
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return (
    '{' +
    keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') +
    '}'
  );
}

export function hashInput(obj: unknown): string {
  return createHash('sha256').update(stableStringify(obj)).digest('hex');
}
