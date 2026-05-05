'use client';

import { useEffect, useState } from 'react';
import { Sparkles, AlertTriangle, RotateCw, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDiagnose } from '@/hooks/useDiagnose';
import { useCampaignDiagnoses } from '@/hooks/useCampaignDiagnoses';
import { hashInputClient } from '@/lib/utils/hashClient';
import { DiagnosisFullView } from './DiagnosisFullView';
import { PreviousDiagnosesList } from './PreviousDiagnosesList';
import type { VerdictInput, VerdictResult } from '@/lib/verdict-engine';
import type { ProfitBreakdown } from '@/lib/metrics/profitWithFees';
import type { AdsetSummary } from '@/lib/claude/prompts';

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

export function AIDiagnosisPanel(props: AIDiagnosisPanelProps) {
  const { data: diagnoses, loading: loadingDiagnoses } = useCampaignDiagnoses(
    props.productId,
    props.campaignId,
  );
  const { diagnose, loading: generating, error } = useDiagnose();
  const [currentInputHash, setCurrentInputHash] = useState<string | null>(null);

  const fromDate = props.dateRange.from;

  // Hash the same shape the server uses (see app/api/diagnose/route.ts).
  // SubtleCrypto is async; setState lands in the .then microtask, not
  // synchronously in the effect body — so it doesn't trigger the
  // set-state-in-effect lint.
  useEffect(() => {
    if (!fromDate) return;
    let cancelled = false;
    const adsetBreakdown = props.adsetBreakdown ?? null;
    void hashInputClient({
      input: props.input,
      dateRange: { from: fromDate, to: props.dateRange.to },
      adsetBreakdown,
    }).then((hash) => {
      if (!cancelled) setCurrentInputHash(hash);
    });
    return () => {
      cancelled = true;
    };
  }, [fromDate, props.dateRange.to, props.input, props.adsetBreakdown]);

  const latest = diagnoses[0] ?? null;
  const previous = diagnoses.slice(1);
  const dataDrifted =
    latest !== null &&
    currentInputHash !== null &&
    latest.inputHash !== currentInputHash;

  const onGenerate = async () => {
    if (!fromDate) {
      toast.error('Pick a date range with at least one day of data first.');
      return;
    }
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
    // useCampaignDiagnoses listens via onSnapshot — the new doc appears
    // automatically, no manual refetch needed.
  };

  const isBudgetBlocked = error?.kind === 'budget_exceeded';
  const showError = error !== null && !isBudgetBlocked;

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

        {!loadingDiagnoses && !latest && !isBudgetBlocked && (
          <Button type="button" size="sm" onClick={onGenerate} disabled={generating}>
            {generating ? (
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

      {loadingDiagnoses && (
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      )}

      {!loadingDiagnoses && !latest && !showError && !isBudgetBlocked && (
        <p className="text-caption text-text-subtle">
          The rule engine already gave you a verdict. Claude can add narrative context — what the
          numbers most likely mean and what to do next.
        </p>
      )}

      {!loadingDiagnoses && latest && (
        <div className="space-y-4">
          {dataDrifted && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning-border/40 bg-warning-bg/10 px-3 py-2">
              <p className="text-caption text-warning-text">
                Data has changed since this diagnosis was generated.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onGenerate}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <RotateCw className="size-4 animate-spin" />
                    Refreshing…
                  </>
                ) : (
                  <>
                    <RotateCw className="size-4" />
                    Refresh diagnosis
                  </>
                )}
              </Button>
            </div>
          )}

          <DiagnosisFullView diagnosis={latest} />

          <PreviousDiagnosesList
            diagnoses={previous}
            currentInputHash={currentInputHash}
          />
        </div>
      )}

      {showError && error && (
        <div className="rounded-md border border-danger-border/40 bg-danger-bg/10 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="size-4 mt-0.5 text-danger-text" />
            <div className="space-y-1">
              <p className="text-caption text-danger-text">{error.message}</p>
              {error.detail && (
                <p className="text-caption font-mono text-text-subtle break-all">
                  {error.detail}
                </p>
              )}
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onGenerate}
            disabled={generating}
          >
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
