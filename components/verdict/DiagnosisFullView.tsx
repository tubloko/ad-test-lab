'use client';

import type { Diagnosis } from '@/types/diagnosis';
import { formatDate } from '@/lib/utils/formatDate';

const CONFIDENCE_TONE: Record<Diagnosis['confidence'], string> = {
  low: 'bg-info-bg/10 text-info-text border-info-border/40',
  medium: 'bg-warning-bg/10 text-warning-text border-warning-border/40',
  high: 'bg-success-bg/10 text-success-text border-success-border/40',
};

interface DiagnosisFullViewProps {
  diagnosis: Diagnosis;
  /** When set, shown as muted footer caption (e.g. "Generated for data through …"). */
  footerNote?: string;
}

export function DiagnosisFullView({
  diagnosis,
  footerNote,
}: DiagnosisFullViewProps) {
  return (
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
        </p>
      </div>

      {footerNote && (
        <p className="text-caption text-text-muted">{footerNote}</p>
      )}
    </div>
  );
}

function confidenceLabel(c: Diagnosis['confidence']): string {
  return c.charAt(0).toUpperCase() + c.slice(1);
}
