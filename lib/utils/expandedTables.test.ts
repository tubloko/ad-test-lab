import { describe, it, expect } from 'vitest';
import {
  parseExpanded,
  serializeExpanded,
  withExpanded,
  isExpanded,
} from './expandedTables';

describe('expandedTables URL state', () => {
  describe('parseExpanded', () => {
    it('returns empty set for null/undefined/empty', () => {
      expect(parseExpanded(null).size).toBe(0);
      expect(parseExpanded(undefined).size).toBe(0);
      expect(parseExpanded('').size).toBe(0);
    });

    it('parses comma-separated keys', () => {
      const set = parseExpanded('campaign-entries,adset-abc123');
      expect(set.has('campaign-entries')).toBe(true);
      expect(set.has('adset-abc123')).toBe(true);
      expect(set.size).toBe(2);
    });

    it('drops empty segments from trailing or repeated commas', () => {
      expect(parseExpanded(',a,,b,').size).toBe(2);
    });
  });

  describe('serializeExpanded', () => {
    it('returns null for empty set so caller can drop the param', () => {
      expect(serializeExpanded(new Set())).toBeNull();
    });

    it('joins keys with comma', () => {
      expect(serializeExpanded(new Set(['a', 'b']))).toBe('a,b');
    });
  });

  describe('withExpanded', () => {
    it('adds a key when expanded=true', () => {
      expect(withExpanded(null, 'campaign-entries', true)).toBe(
        'campaign-entries',
      );
      expect(withExpanded('a', 'b', true)).toBe('a,b');
    });

    it('removes a key when expanded=false', () => {
      expect(withExpanded('a,b', 'a', false)).toBe('b');
    });

    it('returns null when removing the last key', () => {
      expect(withExpanded('a', 'a', false)).toBeNull();
    });

    it('is idempotent on add/remove', () => {
      expect(withExpanded('a,b', 'a', true)).toBe('a,b');
      expect(withExpanded('a', 'b', false)).toBe('a');
    });
  });

  describe('isExpanded', () => {
    it('returns true when the key is present', () => {
      expect(isExpanded('campaign-entries,adset-x', 'adset-x')).toBe(true);
    });

    it('returns false for missing key or empty', () => {
      expect(isExpanded('a', 'b')).toBe(false);
      expect(isExpanded(null, 'b')).toBe(false);
    });
  });
});
