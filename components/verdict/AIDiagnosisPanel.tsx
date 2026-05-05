'use client';

import { useMemo, useState } from 'react';
import { Sparkles, AlertTriangle, RotateCw, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useDiagnose } from '@/hooks/useDiagnose';
import type { Diagnosis } from '@/types/diagnosis';
import type { VerdictInput, VerdictResult } from '@/lib/verdict-engine';
import type { ProfitBreakdown } from '@/lib/metrics/profitWithFees';
import type { AdsetSummary } from '@/lib/claude/prompts';
import { formatDate } from '@/lib/utils/formatDate';

interface AIDiagnosisPanelProps {
  productId: string;
  campaignId: string;
  productName: string;
  campaignName: string;
  dateRange: { from: string | null; to: string };
  input: VerdictInput;
  ruleResult: VerdictResult;
  profitBreakdown: ProfitBreakdown;
  adsetBreakdown?: AdsetSummary[];
}

const CONFIDENCE_TONE: Record<Diagnosis['confidence'], string> = {
  low: 'bg-info-bg/10 text-info-text border-info-border/40',
  medium: 'bg-warning-bg/10 text-warning-text border-warning-border/40',
  high: 'bg-success-bg/10 text-success-text border-success-border/40',
};

export function AIDiagnosisPanel(props: AIDiagnosisPanelProps) {
  const { diagnose, loading, error, diagnosis, status } = useDiagnose();
  const [hasAttempted, setHasAttempted] = useState(false);

  const fromDate = props.dateRange.from;

  const onClick = async () => {
    if (!fromDate) {
      toast.error('Pick a date range with at least one day of data first.');
      return;
    }
    setHasAttempted(true);
    const res = await diagnose({
      productId: props.productId,
      campaignId: props.campaignId,
      productName: props.productName,
      campaignName: props.campaignName,
      dateRange: { from: fromDate, to: props.dateRange.to },
      input: props.input,
      ruleResult: props.ruleResult,
      profitBreakdown: props.profitBreakdown,
      adsetBreakdown: props.adsetBreakdown,
    });
    if (res?.cached) toast.success('Showing cached analysis from earlier');
    else if (res) toast.success('Diagnosis ready');
  };

  const refreshIn = useMemo(() => {
    if (!diagnosis) return null;
    const ms = diagnosis.expiresAt.getTime() - Date.now();
    if (ms <= 0) return null;
    const hours = Math.max(1, Math.round(ms / (60 * 60 * 1000)));
    return hours;
  }, [diagnosis]);

  const isBudgetBlocked = error?.kind === 'budget_exceeded';
  const showResult = status === 'success' && diagnosis;
  const showError = status === 'error' && !isBudgetBlocked;

  return (
    <section className="rounded-lg border border-border bg-surface p-6 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-subheading text-text">AI Diagnosis</h2>
          </div>
          <p className="text-caption text-text-muted">
            Get a deeper read on this test from Claude.
          </p>
        </div>

        {!showResult && !isBudgetBlocked && (
          <Button type="button" size="sm" onClick={onClick} disabled={loading}>
            {loading ? (
              <>
                <RotateCw className="size-4 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Get AI diagnosis
              </>
            )}
          </Button>
        )}
      </header>

      {!hasAttempted && status === 'idle' && (
        <p className="text-caption text-text-subtle">
          The rule engine already gave you a verdict. Claude can add narrative context — what the
          numbers most likely mean and what to do next.
        </p>
      )}

      {showResult && diagnosis && (
        <div className="space-y-4">
          <p className="text-body text-text">{diagnosis.aiSummary}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-caption font-medium text-text-muted">Primary issue</p>
              <p className="text-body text-text">{diagnosis.primaryIssue}</p>
            </div>
            <div className="space-y-1">
              <p className="text-caption font-medium text-text-muted">Recommended action</p>
              <p className="text-body text-text">{diagnosis.recommendedAction}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border-subtle">
            <span
              className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-caption font-medium ${CONFIDENCE_TONE[diagnosis.confidence]}`}
            >
              {confidenceLabel(diagnosis.confidence)} confidence
            </span>
            <p className="text-caption text-text-subtle">
              Generated {formatDate(diagnosis.createdAt)}
              {refreshIn !== null && ` · refresh available in ${refreshIn}h`}
            </p>
          </div>
        </div>
      )}

      {showError && error && (
        <div className="rounded-md border border-danger-border/40 bg-danger-bg/10 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="size-4 mt-0.5 text-danger-text" />
            <p className="text-caption text-danger-text">{error.message}</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={onClick} disabled={loading}>
            <RotateCw className="size-4" />
            Try again
          </Button>
        </div>
      )}

      {isBudgetBlocked && error && (
        <div className="rounded-md border border-border bg-elevated p-4">
          <div className="flex items-start gap-2">
            <Lock className="size-4 mt-0.5 text-text-muted" />
            <div className="space-y-1">
              <p className="text-body text-text">{error.message}</p>
              <p className="text-caption text-text-subtle">
                The rule-based verdict above is still accurate.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function confidenceLabel(c: Diagnosis['confidence']): string {
  return c.charAt(0).toUpperCase() + c.slice(1);
}
