import { z } from 'zod';

// Bounds chosen for the richer system prompt: it asks for 2-4 sentence
// summaries with specific numbers and optional "if that doesn't move
// the needle" alternatives in recommendedAction. Tight bounds caused
// 502s on otherwise-valid model output.
export const DiagnosisOutputSchema = z.object({
  summary: z.string().min(20).max(1500),
  primaryIssue: z.string().min(5).max(400),
  recommendedAction: z.string().min(10).max(1000),
  confidence: z.enum(['low', 'medium', 'high']),
});

export type DiagnosisOutput = z.infer<typeof DiagnosisOutputSchema>;
