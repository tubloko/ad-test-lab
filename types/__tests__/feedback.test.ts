import { describe, expect, it } from 'vitest';
import { FeedbackSubmitSchema } from '../feedback';

describe('FeedbackSubmitSchema', () => {
  const baseInput = {
    type: 'bug' as const,
    message: 'This is a valid feedback message.',
    pageUrl: 'https://example.com/page',
  };

  it('accepts a well-formed submission', () => {
    expect(FeedbackSubmitSchema.safeParse(baseInput).success).toBe(true);
  });

  it('accepts an optional context field', () => {
    const result = FeedbackSubmitSchema.safeParse({
      ...baseInput,
      context: 'I was on the dashboard.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty message', () => {
    const result = FeedbackSubmitSchema.safeParse({ ...baseInput, message: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a message shorter than 10 characters', () => {
    const result = FeedbackSubmitSchema.safeParse({ ...baseInput, message: 'too short' });
    expect(result.success).toBe(false);
  });

  it('rejects a message longer than 2000 characters', () => {
    const result = FeedbackSubmitSchema.safeParse({
      ...baseInput,
      message: 'x'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid type', () => {
    const result = FeedbackSubmitSchema.safeParse({
      ...baseInput,
      type: 'rant',
    });
    expect(result.success).toBe(false);
  });
});
