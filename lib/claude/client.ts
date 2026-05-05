import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set');
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const CLAUDE_MODEL = 'claude-sonnet-4-5';
export const MAX_TOKENS = 1000;

// Approximate Sonnet 4.5 pricing as of 2026-05.
export const INPUT_COST_PER_TOKEN = 3 / 1_000_000;
export const OUTPUT_COST_PER_TOKEN = 15 / 1_000_000;

export function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  return inputTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN;
}
