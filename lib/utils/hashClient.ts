// Client-side counterpart of lib/utils/hash.ts. Must produce the same
// digest as the server for the same input — that's how the UI compares
// "current data" to a stored diagnosis's inputHash. Server uses
// node:crypto sha256; the browser does the same via SubtleCrypto.

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  // Skip undefined-valued keys to match JSON.stringify. The server hashes
  // the body after JSON.parse, which has already dropped undefined fields;
  // the client must do the same so the two digests agree.
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return (
    '{' +
    keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') +
    '}'
  );
}

export async function hashInputClient(obj: unknown): Promise<string> {
  const data = new TextEncoder().encode(stableStringify(obj));
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
