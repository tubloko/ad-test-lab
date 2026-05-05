import { z } from 'zod';

export const FEEDBACK_TYPES = ['bug', 'feature', 'general', 'confused'] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  bug: 'Bug report',
  feature: 'Feature request',
  general: 'General feedback / question',
  confused: 'Something is unclear',
};

export const FeedbackSubmitSchema = z.object({
  type: z.enum(FEEDBACK_TYPES),
  message: z
    .string()
    .min(10, 'Please describe in at least 10 characters')
    .max(2000),
  context: z.string().max(500).optional(),
  pageUrl: z.string().max(500),
});

export type FeedbackSubmitInput = z.infer<typeof FeedbackSubmitSchema>;
