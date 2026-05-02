import { describe, it, expect } from 'vitest';
import { hashInput } from './hash';

describe('hashInput', () => {
  it('produces a 64-char hex string', () => {
    expect(hashInput({ a: 1 })).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic', () => {
    expect(hashInput({ a: 1, b: 2 })).toBe(hashInput({ a: 1, b: 2 }));
  });

  it('is order-independent on object keys', () => {
    expect(hashInput({ a: 1, b: 2 })).toBe(hashInput({ b: 2, a: 1 }));
  });

  it('differs for different values', () => {
    expect(hashInput({ a: 1 })).not.toBe(hashInput({ a: 2 }));
  });

  it('handles primitives, arrays, and nested objects', () => {
    expect(hashInput(['x', 1, { y: true }])).toMatch(/^[0-9a-f]{64}$/);
  });
});
