import 'server-only';
import type Anthropic from '@anthropic-ai/sdk';
import {
  anthropic,
  CLAUDE_MODEL,
  MAX_TOKENS,
  estimateCostUsd,
} from './client';
import { SYSTEM_PROMPT, buildDiagnosisPrompt, type PromptContext } from './prompts';
import type { DiagnosisOutput } from './schema';
import { parseAndValidate } from './parse';

export interface DiagnoseUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface DiagnoseResult {
  output: DiagnosisOutput;
  usage: DiagnoseUsage;
}

export async function generateDiagnosis(ctx: PromptContext): Promise<DiagnoseResult> {
  const userPrompt = buildDiagnosisPrompt(ctx);

  const startedAt = Date.now();
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });
  const durationMs = Date.now() - startedAt;

  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;
  console.log('[diagnose] claude response time', {
    durationMs,
    inputTokens,
    outputTokens,
  });

  const text = extractText(response);
  let output: DiagnosisOutput;
  try {
    output = parseAndValidate(text);
  } catch (err) {
    // Surface the raw model output when parsing/validation fails so we
    // can tell at a glance whether Claude returned bad JSON or content
    // that violated our zod bounds.
    console.error('[diagnose] claude output parse/validate failed', {
      rawText: text.slice(0, 1500),
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
  const costUsd = estimateCostUsd(inputTokens, outputTokens);

  return { output, usage: { inputTokens, outputTokens, costUsd } };
}

function extractText(response: Anthropic.Message): string {
  const block = response.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') {
    throw new Error('No text block in Claude response');
  }
  return block.text;
}
