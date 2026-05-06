import type { Diagnosis } from '@/types/diagnosis';

// Detects when the AI returned an orientation read instead of a full
// diagnosis. The system prompt instructs the model to set confidence to
// "low" and either prefix primaryIssue with "Too early to diagnose" or
// describe an early-stage observation, so we match on those signals.
const ORIENTATION_HINT = /\b(too early|orientation|early[- ]stage)\b/i;

export function isOrientationDiagnosis(d: Pick<Diagnosis, 'confidence' | 'primaryIssue'>): boolean {
  return d.confidence === 'low' && ORIENTATION_HINT.test(d.primaryIssue);
}
