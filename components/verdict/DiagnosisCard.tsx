'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { VerdictBadge } from '@/components/verdict/VerdictBadge';
import { cn } from '@/lib/utils';
import { formatRelative } from '@/lib/utils/formatRelative';
import { isOrientationDiagnosis } from '@/lib/claude/orientation';
import type { Diagnosis } from '@/types/diagnosis';

interface DiagnosisCardProps {
  diagnosis: Diagnosis;
  /** Default collapsed; users opt in to read the full content. */
  defaultExpanded?: boolean;
  /** Renders an inline warning above the body when the underlying data has drifted. */
  showStaleWarning?: boolean;
}

export function DiagnosisCard({
  diagnosis,
  defaultExpanded = false,
  showStaleWarning = false,
}: DiagnosisCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-lg border border-border bg-surface">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 rounded-lg p-4 text-left transition-colors hover:bg-elevated"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <VerdictBadge verdict={diagnosis.ruleVerdict} size="sm" />
          <p className="truncate text-body text-text">{diagnosis.primaryIssue}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-caption text-text-muted">
            {formatRelative(diagnosis.createdAt)}
          </span>
          <ChevronDown
            className={cn(
              'size-4 text-text-muted transition-transform',
              expanded && 'rotate-180',
            )}
          />
        </div>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-border-subtle px-4 pt-4 pb-4">
          {showStaleWarning && (
            <div className="rounded-md border border-warning-border/40 bg-warning-bg/30 px-3 py-2 text-caption text-warning-text">
              Data has changed since this diagnosis was generated.
            </div>
          )}
          {isOrientationDiagnosis(diagnosis) && (
            <p className="text-caption italic text-text-muted">
              Orientation read — too early for a final verdict.
            </p>
          )}
          <div className="space-y-1">
            <p className="text-caption font-medium text-text-muted">Summary</p>
            <p className="text-body text-text whitespace-pre-wrap">{diagnosis.aiSummary}</p>
          </div>
          <div className="space-y-1">
            <p className="text-caption font-medium text-text-muted">Primary issue</p>
            <p className="text-body text-text">{diagnosis.primaryIssue}</p>
          </div>
          <div className="space-y-1">
            <p className="text-caption font-medium text-text-muted">Recommended action</p>
            <p className="text-body text-text whitespace-pre-wrap">{diagnosis.recommendedAction}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2 text-caption text-text-muted">
            <span>Confidence: {capitalize(diagnosis.confidence)}</span>
            <span className="text-text-subtle">·</span>
            <span className="text-text-subtle">
              Data through {diagnosis.dateRange.to}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
