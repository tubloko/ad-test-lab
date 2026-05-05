'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VerdictBadge } from '@/components/verdict/VerdictBadge';
import { DiagnosisFullView } from '@/components/verdict/DiagnosisFullView';
import { cn } from '@/lib/utils';
import type { Diagnosis } from '@/types/diagnosis';

const SHORT_DATE = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});

const FULL_DATE = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

interface PreviousDiagnosesListProps {
  diagnoses: Diagnosis[];
  /** Compared against each entry's inputHash to label data drift in the dialog. */
  currentInputHash: string | null;
}

export function PreviousDiagnosesList({
  diagnoses,
  currentInputHash,
}: PreviousDiagnosesListProps) {
  const [expanded, setExpanded] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  if (diagnoses.length === 0) return null;

  const open = diagnoses.find((d) => d.id === openId) ?? null;

  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex items-center gap-2 text-caption text-text-muted transition-colors hover:text-text"
      >
        <ChevronRight
          className={cn(
            'size-3 transition-transform',
            expanded && 'rotate-90',
          )}
        />
        Previous diagnoses ({diagnoses.length})
      </button>

      {expanded && (
        <ul className="mt-2 flex flex-col divide-y divide-border-subtle border-y border-border-subtle">
          {diagnoses.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => setOpenId(d.id)}
                className="flex h-8 w-full items-center gap-3 px-1 text-left transition-colors hover:bg-elevated"
              >
                <span className="w-12 shrink-0 text-caption font-mono tabular-nums text-text-muted">
                  {SHORT_DATE.format(d.createdAt)}
                </span>
                <VerdictBadge verdict={d.ruleVerdict} size="sm" />
                <span className="flex-1 truncate text-caption text-text-muted">
                  {capitalize(d.confidence)} confidence
                </span>
                <ChevronRight className="size-3 shrink-0 text-text-subtle" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={openId !== null}
        onOpenChange={(next) => {
          if (!next) setOpenId(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="text-subheading text-text">
                  Diagnosis from {FULL_DATE.format(open.createdAt)}
                </DialogTitle>
              </DialogHeader>
              <DiagnosisFullView
                diagnosis={open}
                footerNote={`Generated for data through ${open.dateRange.to}. Data has ${
                  currentInputHash !== null && open.inputHash !== currentInputHash
                    ? 'changed'
                    : 'not changed'
                } since.`}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
