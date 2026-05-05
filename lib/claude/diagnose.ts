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
  const output = parseAndValidate(text);
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
