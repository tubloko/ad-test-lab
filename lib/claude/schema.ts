import { z } from 'zod';

// Bounds chosen for the richer system prompt: it asks for 2-4 sentence
// diagnostic summaries OR shorter orientation reads on early-stage data.
// Tight lower bounds caused 502s on otherwise-valid model output, so we
// keep them permissive enough for terse orientation responses.
export const DiagnosisOutputSchema = z.object({
  summary: z.string().min(30).max(1500),
  primaryIssue: z.string().min(5).max(400),
  recommendedAction: z.string().min(10).max(1000),
  confidence: z.enum(['low', 'medium', 'high']),
});

export type DiagnosisOutput = z.infer<typeof DiagnosisOutputSchema>;
