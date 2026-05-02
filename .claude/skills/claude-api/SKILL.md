---
name: adtestlab-claude-api
description: How to call the Anthropic Claude API in AdTestLab — the AI diagnosis layer. Use this skill when working in app/api/diagnose/, lib/claude/, designing prompts for verdict diagnosis, handling rate limiting and caching for AI calls, or when the user mentions Claude API, AI diagnosis, prompt, or LLM integration. Read this BEFORE writing any code that calls Anthropic.
---

# AdTestLab Claude API Integration

The AI diagnosis is what makes AdTestLab more than a calculator. Get this right.

## Architecture

```
Browser → POST /api/diagnose (with Firebase ID token)
            ↓
         Verify token → get uid
            ↓
         Check rate limit (Firestore)
            ↓
         Compute input hash
            ↓
         Cache hit? → return cached
            ↓
         Run rule engine (sync, ~1ms)
            ↓
         Build prompt with data + rule verdict
            ↓
         Call Claude API
            ↓
         Validate JSON output (zod)
            ↓
         Cache result + increment usage
            ↓
         Return to client
```

## Folder Layout

```
lib/claude/
├── client.ts        # Anthropic SDK setup
├── prompts.ts       # buildDiagnosisPrompt(data) → string
├── schema.ts        # zod schema for AI output validation
└── diagnose.ts      # the orchestrator: input → cached or fresh diagnosis

app/api/diagnose/
└── route.ts         # POST handler, auth, rate limit, calls diagnose.ts
```

## Client Setup

```ts
// lib/claude/client.ts
import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set');
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const CLAUDE_MODEL = 'claude-sonnet-4-5';
export const MAX_TOKENS = 1000;
```

**Never expose `ANTHROPIC_API_KEY` to the client.** It only lives in the server environment. Check Vercel project settings.

## Prompt Design

```ts
// lib/claude/prompts.ts
import type { VerdictInput, VerdictResult } from '@/lib/verdict-engine/types';

interface PromptContext {
  productName: string;
  dateRange: { from: string; to: string };
  input: VerdictInput;
  ruleResult: VerdictResult;
  adsetBreakdown?: Array<{ name: string; spend: number; ctr: number; atcRate: number }>;
}

export const SYSTEM_PROMPT = `You are a Meta ads diagnostic expert for Shopify product testing.
You analyze daily ad performance data and identify the single most likely reason a product test is underperforming.

Diagnostic framework:
- CTR low → creative problem (hook, visual, angle)
- LPV/Clicks low → tracking issue, slow page load, or click fraud
- ATC/LPV low → landing page weak, offer unclear, or wrong audience
- IC/ATC low → checkout friction, shipping cost shock, or required account
- Orders/IC low → payment issue, trust gap, or pricing rejection at final step
- CPA above target with healthy funnel → market saturation or pricing problem

Rules:
- Be specific. Reference exact numbers from the data.
- Pick ONE primary issue, not three.
- If data is insufficient, say so honestly.
- 2–4 sentences for summary. No fluff.
- Use the seller's perspective: "your CTR" not "the CTR".

Output format: ONLY valid JSON matching this schema, no markdown, no preamble:
{
  "summary": string,           // 2-4 sentences
  "primaryIssue": string,      // 1 sentence: the single biggest problem
  "recommendedAction": string, // 1-2 sentences: what to do next
  "confidence": "low" | "medium" | "high"
}`;

export function buildDiagnosisPrompt(ctx: PromptContext): string {
  const { productName, dateRange, input, ruleResult, adsetBreakdown } = ctx;
  const m = ruleResult.metrics;

  return `Product: ${productName}
Target CPA: $${input.targetCPA}
Date range: ${dateRange.from} to ${dateRange.to} (${input.daysActive} days)

TOTALS:
- Spend: $${input.totalSpend.toFixed(2)}
- Revenue: $${input.totalRevenue.toFixed(2)}
- Orders: ${input.totalOrders}
- COGS: $${input.totalCOGS.toFixed(2)}
- Profit: $${m.profit.toFixed(2)}

FUNNEL:
- Clicks: ${input.totalClicks}
- LPV: ${input.totalLPV} (${m.lpvRate.toFixed(1)}% of clicks)
- ATC: ${input.totalATC} (${m.atcRate.toFixed(1)}% of LPV)
- IC: ${input.totalIC} (${m.icRate.toFixed(1)}% of ATC)
- Orders: ${input.totalOrders} (${m.purchaseRate.toFixed(1)}% of IC)

KEY METRICS:
- CPA: $${m.cpa.toFixed(2)} (target: $${input.targetCPA})
- ROAS: ${m.roas.toFixed(2)}
${adsetBreakdown ? `\nADSETS:\n${adsetBreakdown.map(a => `- ${a.name}: $${a.spend} spend, ${a.ctr.toFixed(2)}% CTR, ${a.atcRate.toFixed(1)}% ATC`).join('\n')}` : ''}

RULE ENGINE VERDICT: ${ruleResult.verdict}
RULE ENGINE REASON: ${ruleResult.reason}

Provide your diagnosis as JSON.`;
}
```

**Prompt design principles:**
- System prompt = the rules and the schema. Never changes per request.
- User prompt = the data. Changes every request.
- Numbers are pre-formatted — don't make Claude do math.
- Include the rule engine's verdict so Claude can agree, refine, or push back.
- Be explicit about JSON format. LLMs love adding markdown.

## Output Validation

```ts
// lib/claude/schema.ts
import { z } from 'zod';

export const DiagnosisSchema = z.object({
  summary: z.string().min(20).max(800),
  primaryIssue: z.string().min(5).max(200),
  recommendedAction: z.string().min(10).max(400),
  confidence: z.enum(['low', 'medium', 'high']),
});

export type Diagnosis = z.infer<typeof DiagnosisSchema>;
```

Always validate. LLMs occasionally drift from the schema.

## The Diagnose Function

```ts
// lib/claude/diagnose.ts
import { anthropic, CLAUDE_MODEL, MAX_TOKENS } from './client';
import { SYSTEM_PROMPT, buildDiagnosisPrompt } from './prompts';
import { DiagnosisSchema, type Diagnosis } from './schema';
import { getVerdict } from '@/lib/verdict-engine';
import type { VerdictInput } from '@/lib/verdict-engine/types';

interface DiagnoseArgs {
  productName: string;
  dateRange: { from: string; to: string };
  input: VerdictInput;
}

export async function generateDiagnosis(args: DiagnoseArgs): Promise<Diagnosis> {
  const ruleResult = getVerdict(args.input);
  const userPrompt = buildDiagnosisPrompt({ ...args, ruleResult });

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = extractText(response);
  const parsed = parseAndValidate(text);
  return parsed;
}

function extractText(response: Anthropic.Message): string {
  const block = response.content.find(b => b.type === 'text');
  if (!block || block.type !== 'text') {
    throw new Error('No text block in Claude response');
  }
  return block.text;
}

function parseAndValidate(text: string): Diagnosis {
  // Strip markdown fences if Claude added them
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    throw new Error(`Claude returned invalid JSON: ${cleaned.slice(0, 200)}`);
  }

  const result = DiagnosisSchema.safeParse(json);
  if (!result.success) {
    throw new Error(`Claude output failed schema: ${result.error.message}`);
  }
  return result.data;
}
```

## API Route

```ts
// app/api/diagnose/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { generateDiagnosis } from '@/lib/claude/diagnose';
import { checkAndIncrementUsage } from '@/lib/firebase/usage';
import { getCachedDiagnosis, cacheDiagnosis } from '@/lib/firebase/diagnoses';
import { hashInput } from '@/lib/utils/hash';

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // 2. Parse body
    const body = await req.json();
    const { productId, productName, dateRange, input } = body;

    // 3. Cache check
    const inputHash = hashInput({ input, dateRange });
    const cached = await getCachedDiagnosis(uid, productId, inputHash);
    if (cached) return NextResponse.json({ diagnosis: cached, cached: true });

    // 4. Rate limit (5/day)
    const allowed = await checkAndIncrementUsage(uid);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Daily limit reached (5/day). Try again tomorrow.' },
        { status: 429 }
      );
    }

    // 5. Generate
    const diagnosis = await generateDiagnosis({ productName, dateRange, input });

    // 6. Cache
    await cacheDiagnosis(uid, productId, inputHash, diagnosis);

    return NextResponse.json({ diagnosis, cached: false });
  } catch (error) {
    console.error('Diagnose error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

## Caching

Cache key = SHA-256 of the input data. Same numbers → same diagnosis → no API call.

```ts
// lib/utils/hash.ts
import { createHash } from 'crypto';

export function hashInput(obj: unknown): string {
  return createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}
```

Cache duration: 24 hours. After that, force a fresh diagnosis even with same inputs (numbers unchanged but context might be — Meta updates, market shifts).

## Rate Limiting

5 diagnoses per user per day. Stored on user document.

```ts
// lib/firebase/usage.ts
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { adminDb } from './admin'; // Admin SDK on server

const DAILY_LIMIT = 5;

export async function checkAndIncrementUsage(uid: string): Promise<boolean> {
  const ref = adminDb.doc(`users/${uid}`);
  const snap = await ref.get();
  const data = snap.data();
  if (!data) return false;

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const lastResetDate = data.diagnosesResetDate ?? '';

  if (lastResetDate !== today) {
    await ref.update({ diagnosesUsedToday: 1, diagnosesResetDate: today });
    return true;
  }

  if ((data.diagnosesUsedToday ?? 0) >= DAILY_LIMIT) return false;

  await ref.update({ diagnosesUsedToday: (data.diagnosesUsedToday ?? 0) + 1 });
  return true;
}
```

## Client-Side Call

```ts
// hooks/useDiagnose.ts
'use client';
import { useState } from 'react';
import { auth } from '@/lib/firebase/config';
import type { Diagnosis } from '@/lib/claude/schema';

export function useDiagnose() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);

  async function diagnose(payload: { productId: string; productName: string; dateRange: any; input: any }) {
    setLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      const data = await res.json();
      setDiagnosis(data.diagnosis);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return { diagnose, loading, error, diagnosis };
}
```

## Cost Watch

- Each call: ~2K input tokens + ~300 output tokens ≈ **$0.01**
- Daily limit per user: 5 → max **$0.05/user/day**
- 50 users × 30 days = max **$75/month** worst case
- With caching, real cost is typically 30–50% lower

**Set `ANTHROPIC_BUDGET_LIMIT` in the Anthropic console** as a safety net. $20/month during validation is plenty.

## Common Mistakes

❌ **Calling Claude from a client component.** Always go through the API route.

❌ **Forgetting to validate the JSON output.** Claude occasionally returns invalid JSON.

❌ **Caching forever.** 24h max — data drifts.

❌ **Skipping rate limit because "we're small".** A loop bug could burn $100 in an hour.

❌ **Building the prompt inline.** Always use `buildDiagnosisPrompt`.

❌ **Embedding the rule engine inside the prompt builder.** They're separate. The orchestrator (`generateDiagnosis`) calls the engine, then passes the result to the prompt builder.
