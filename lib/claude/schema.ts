import { z } from 'zod';

export const DiagnosisOutputSchema = z.object({
  summary: z.string().min(20).max(800),
  primaryIssue: z.string().min(5).max(200),
  recommendedAction: z.string().min(10).max(400),
  confidence: z.enum(['low', 'medium', 'high']),
});

export type DiagnosisOutput = z.infer<typeof DiagnosisOutputSchema>;
