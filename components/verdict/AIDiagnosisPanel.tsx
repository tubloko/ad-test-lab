'use client';

import { useEffect, useState } from 'react';
import { Sparkles, AlertTriangle, RotateCw, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useDiagnose } from '@/hooks/useDiagnose';
import { useCampaignDiagnoses } from '@/hooks/useCampaignDiagnoses';
import { hashInputClient } from '@/lib/utils/hashClient';
import { DiagnosisCard } from './DiagnosisCard';
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
  const [confirmOpen, setConfirmOpen] = useState(false);

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
  const sameAsLatest =
    latest !== null &&
    currentInputHash !== null &&
    latest.inputHash === currentInputHash;

  const runDiagnose = async (force: boolean) => {
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
      force,
    });
    if (res?.cached) toast.success('Showing cached analysis from earlier');
    else if (res) toast.success('Diagnosis ready');
    // useCampaignDiagnoses listens via onSnapshot — the new doc appears
    // automatically, no manual refetch needed.
  };

  const onGenerateClick = () => {
    if (sameAsLatest) {
      setConfirmOpen(true);
      return;
    }
    void runDiagnose(false);
  };

  const onConfirmGenerate = async () => {
    await runDiagnose(true);
  };

  const isBudgetBlocked = error?.kind === 'budget_exceeded';
  const showError = error !== null && !isBudgetBlocked;
  // The button stays visible at all times once we know there's data to
  // diagnose — same-data clicks open a confirmation, fresh-data clicks go
  // straight through.
  const showGenerateButton =
    !loadingDiagnoses && !isBudgetBlocked && fromDate !== null;
  const generateLabel = latest ? 'Generate new' : 'Get AI diagnosis';

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

        {showGenerateButton && (
          <Button
            type="button"
            size="sm"
            onClick={onGenerateClick}
            disabled={generating}
          >
            {generating ? (
              <>
                <RotateCw className="size-4 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                {generateLabel}
              </>
            )}
          </Button>
        )}
      </header>

      {loadingDiagnoses && (
        <Skeleton className="h-16 w-full rounded-lg" />
      )}

      {!loadingDiagnoses && !latest && !showError && !isBudgetBlocked && (
        <p className="text-caption text-text-subtle">
          The rule engine already gave you a verdict. Claude can add narrative context — what the
          numbers most likely mean and what to do next.
        </p>
      )}

      {!loadingDiagnoses && latest && (
        <div className="space-y-4">
          <DiagnosisCard
            key={latest.id}
            diagnosis={latest}
            defaultExpanded={false}
            showStaleWarning={dataDrifted}
          />

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
            onClick={onGenerateClick}
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

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Same data, likely same answer"
        description="Your data hasn't changed since the last diagnosis. Claude will likely return a similar result. Generate anyway?"
        confirmLabel="Generate anyway"
        cancelLabel="Cancel"
        confirmVariant="default"
        onConfirm={onConfirmGenerate}
      />
    </section>
  );
}
