import { z } from 'zod';
import { DateStringSchema } from './entry';

export const VERDICT_TYPES = [
  'NEED_MORE_DATA',
  'KILL',
  'CHECKOUT_ISSUE',
  'FIX_OFFER',
  'FIX_LP',
  'FIX_CREATIVE',
  'CONTINUE',
] as const;

export const CONFIDENCE_LEVELS = ['low', 'medium', 'high'] as const;

export const VerdictTypeSchema = z.enum(VERDICT_TYPES);
export const ConfidenceLevelSchema = z.enum(CONFIDENCE_LEVELS);

export const DiagnosisSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  campaignId: z.string().min(1),
  inputHash: z.string().min(1),
  dateRange: z.object({ from: DateStringSchema, to: DateStringSchema }),
  ruleVerdict: VerdictTypeSchema,
  aiSummary: z.string().min(1).max(4000),
  primaryIssue: z.string().min(1).max(500),
  recommendedAction: z.string().min(1).max(1000),
  confidence: ConfidenceLevelSchema,
  createdAt: z.date(),
  expiresAt: z.date(),
});

export type Diagnosis = z.infer<typeof DiagnosisSchema>;
export type VerdictTypeValue = z.infer<typeof VerdictTypeSchema>;
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;
