import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { adminAuth } from '@/lib/firebase/admin';
import { generateDiagnosis } from '@/lib/claude/diagnose';
import { checkAndIncrementUsage, decrementUsage } from '@/lib/firebase/usage';
import { getCachedDiagnosis, cacheDiagnosis } from '@/lib/firebase/diagnoses';
import {
  isBudgetExceeded,
  addToMonthlySpend,
  currentMonthKey,
} from '@/lib/firebase/budget';
import { hashInput } from '@/lib/utils/hash';

export const runtime = 'nodejs';
// Claude Sonnet 4.5 with our long system prompt can take 10-30s. Vercel
// Hobby's 10s default 504s us. 60s is the Hobby ceiling and is the cap
// we want even on Pro — if a call is slower than 60s, retry beats waiting.
export const maxDuration = 60;

const VerdictTypeSchema = z.enum([
  'NEED_MORE_DATA',
  'KILL',
  'CHECKOUT_ISSUE',
  'FIX_OFFER',
  'FIX_LP',
  'FIX_CREATIVE',
  'CONTINUE',
]);

const VerdictInputSchema = z.object({
  totalSpend: z.number(),
  totalRevenue: z.number(),
  totalOrders: z.number(),
  totalCOGS: z.number(),
  totalClicks: z.number(),
  totalLPV: z.number(),
  totalATC: z.number(),
  totalIC: z.number(),
  daysActive: z.number(),
  targetCPA: z.number(),
  transactionFeePercent: z.number().optional(),
  transactionFeeFixed: z.number().optional(),
  shippingCost: z.number().optional(),
  refundRate: z.number().optional(),
});

const VerdictResultSchema = z.object({
  verdict: VerdictTypeSchema,
  reason: z.string(),
  metrics: z.object({
    cpa: z.number(),
    roas: z.number(),
    profit: z.number(),
    ctr: z.number(),
    lpvRate: z.number(),
    atcRate: z.number(),
    icRate: z.number(),
    purchaseRate: z.number(),
  }),
  triggeredRule: z.string(),
});

const ProfitBreakdownSchema = z.object({
  grossRevenue: z.number(),
  transactionFees: z.number(),
  shippingTotal: z.number(),
  expectedRefunds: z.number(),
  netRevenue: z.number(),
  totalCosts: z.number(),
  profit: z.number(),
});

const AdsetSummarySchema = z.object({
  name: z.string(),
  spend: z.number(),
  ctr: z.number().optional(),
  atcRate: z.number().optional(),
});

const BodySchema = z.object({
  productId: z.string().min(1),
  campaignId: z.string().min(1),
  productName: z.string(),
  campaignName: z.string(),
  dateRange: z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  input: VerdictInputSchema,
  ruleResult: VerdictResultSchema,
  profitBreakdown: ProfitBreakdownSchema,
  adsetBreakdown: z.array(AdsetSummarySchema).optional(),
});

export async function POST(req: NextRequest) {
  // 1. Auth
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : '';
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch (err) {
    console.error('[diagnose] token verification failed', err);
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 2. Parse + validate body
  let body: z.infer<typeof BodySchema>;
  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      console.error('[diagnose] invalid body', { uid, issues: parsed.error.issues });
      return NextResponse.json(
        { error: 'bad_request', message: 'Invalid request body.' },
        { status: 400 },
      );
    }
    body = parsed.data;
  } catch (err) {
    console.error('[diagnose] body parse error', { uid, err });
    return NextResponse.json(
      { error: 'bad_request', message: 'Could not parse request body.' },
      { status: 400 },
    );
  }

  const { productId, campaignId, dateRange, input, ruleResult } = body;

  // 3. Cache check
  const inputHash = hashInput({ input, dateRange });
  try {
    const cached = await getCachedDiagnosis(uid, productId, campaignId, inputHash);
    if (cached) {
      return NextResponse.json({ diagnosis: cached, cached: true });
    }
  } catch (err) {
    console.error('[diagnose] cache lookup failed', { uid, productId, campaignId, err });
    // fall through — we'd rather generate fresh than 500
  }

  // 4. Budget cap (global, monthly)
  try {
    if (await isBudgetExceeded()) {
      console.error('[diagnose] monthly budget exceeded', { uid, monthKey: currentMonthKey() });
      return NextResponse.json(
        {
          error: 'budget_exceeded',
          message:
            'AI diagnosis is paused for the month. Service resumes on the 1st.',
        },
        { status: 503 },
      );
    }
  } catch (err) {
    console.error('[diagnose] budget check failed', { uid, err });
    return NextResponse.json(
      { error: 'internal', message: 'AI diagnosis is temporarily unavailable.' },
      { status: 500 },
    );
  }

  // 5. Per-user daily rate limit
  let usageBefore: Awaited<ReturnType<typeof checkAndIncrementUsage>>;
  try {
    usageBefore = await checkAndIncrementUsage(uid);
  } catch (err) {
    console.error('[diagnose] usage increment failed', { uid, err });
    return NextResponse.json(
      { error: 'internal', message: 'AI diagnosis is temporarily unavailable.' },
      { status: 500 },
    );
  }
  if (!usageBefore.allowed) {
    return NextResponse.json(
      {
        error: 'daily_limit',
        message: `Daily limit reached (${usageBefore.used}/${usageBefore.limit}). Resets at midnight in your timezone.`,
        used: usageBefore.used,
        limit: usageBefore.limit,
      },
      { status: 429 },
    );
  }

  // 6. Generate
  let generation: Awaited<ReturnType<typeof generateDiagnosis>>;
  try {
    generation = await generateDiagnosis({
      campaignName: body.campaignName,
      productName: body.productName,
      dateRange: body.dateRange,
      input,
      ruleResult,
      profitBreakdown: body.profitBreakdown,
      adsetBreakdown: body.adsetBreakdown,
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout =
      name === 'APIConnectionTimeoutError' ||
      /timeout|aborted/i.test(message);
    console.error('[diagnose] generation failed', {
      uid,
      productId,
      campaignId,
      name,
      message,
      isTimeout,
    });
    // Refund the usage credit so the user isn't punished for an upstream failure.
    try {
      await decrementUsage(uid);
    } catch (decErr) {
      console.error('[diagnose] decrement after failure also failed', { uid, decErr });
    }
    if (isTimeout) {
      return NextResponse.json(
        {
          error: 'timeout',
          message:
            'AI is thinking longer than usual. Try again — second attempt is often faster.',
        },
        { status: 504 },
      );
    }
    return NextResponse.json(
      {
        error: 'upstream',
        message: 'AI service temporarily unavailable. Try again in a moment.',
      },
      { status: 502 },
    );
  }

  // 7. Track spend
  try {
    await addToMonthlySpend(generation.usage.costUsd);
  } catch (err) {
    console.error('[diagnose] addToMonthlySpend failed', { uid, err });
    // not fatal — diagnosis already generated
  }

  // 8. Cache + return
  try {
    const cached = await cacheDiagnosis(uid, {
      productId,
      campaignId,
      inputHash,
      dateRange,
      ruleVerdict: ruleResult.verdict,
      aiSummary: generation.output.summary,
      primaryIssue: generation.output.primaryIssue,
      recommendedAction: generation.output.recommendedAction,
      confidence: generation.output.confidence,
    });
    return NextResponse.json({ diagnosis: cached, cached: false });
  } catch (err) {
    console.error('[diagnose] cache write failed', { uid, productId, campaignId, err });
    return NextResponse.json(
      { error: 'internal', message: 'Generated diagnosis but could not save it.' },
      { status: 500 },
    );
  }
}

