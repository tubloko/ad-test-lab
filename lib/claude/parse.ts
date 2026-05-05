import { DiagnosisOutputSchema, type DiagnosisOutput } from './schema';

export function stripFences(text: string): string {
  return text
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

export function parseAndValidate(text: string): DiagnosisOutput {
  const cleaned = stripFences(text);

  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    throw new Error(`Claude returned invalid JSON: ${cleaned.slice(0, 200)}`);
  }

  const result = DiagnosisOutputSchema.safeParse(json);
  if (!result.success) {
    throw new Error(`Claude output failed schema: ${result.error.message}`);
  }
  return result.data;
}
