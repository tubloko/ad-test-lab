'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { auth } from '@/lib/firebase/config';
import type { Diagnosis } from '@/types/diagnosis';
import type { VerdictInput, VerdictResult } from '@/lib/verdict-engine';
import type { ProfitBreakdown } from '@/lib/metrics/profitWithFees';
import type { AdsetSummary } from '@/lib/claude/prompts';

export type DiagnoseStatus = 'idle' | 'loading' | 'success' | 'error';

export interface DiagnoseErrorKind {
  kind:
    | 'unauthorized'
    | 'daily_limit'
    | 'budget_exceeded'
    | 'upstream'
    | 'timeout'
    | 'bad_request'
    | 'internal';
  message: string;
  used?: number;
  limit?: number;
}

export interface DiagnosePayload {
  productId: string;
  campaignId: string;
  productName: string;
  campaignName: string;
  dateRange: { from: string; to: string };
  input: VerdictInput;
  ruleResult: VerdictResult;
  profitBreakdown: ProfitBreakdown;
  adsetBreakdown?: AdsetSummary[];
}

export interface DiagnoseSuccess {
  diagnosis: Diagnosis;
  cached: boolean;
}

interface UseDiagnoseReturn {
  diagnose: (payload: DiagnosePayload) => Promise<DiagnoseSuccess | null>;
  loading: boolean;
  error: DiagnoseErrorKind | null;
  diagnosis: Diagnosis | null;
  status: DiagnoseStatus;
  reset: () => void;
}

export function useDiagnose(): UseDiagnoseReturn {
  const [status, setStatus] = useState<DiagnoseStatus>('idle');
  const [error, setError] = useState<DiagnoseErrorKind | null>(null);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  const diagnose = useCallback(
    async (payload: DiagnosePayload): Promise<DiagnoseSuccess | null> => {
      setStatus('loading');
      setError(null);

      const user = auth.currentUser;
      if (!user) {
        setError({ kind: 'unauthorized', message: 'You need to sign in to run a diagnosis.' });
        setStatus('error');
        return null;
      }

      let token: string;
      try {
        token = await user.getIdToken();
      } catch {
        setError({ kind: 'unauthorized', message: 'Could not refresh your session. Sign in again.' });
        setStatus('error');
        return null;
      }

      let res: Response;
      try {
        res = await fetch('/api/diagnose', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } catch {
        setError({ kind: 'internal', message: 'Network error. Check your connection and try again.' });
        setStatus('error');
        return null;
      }

      if (res.ok) {
        const raw = (await res.json()) as {
          diagnosis: Omit<Diagnosis, 'createdAt' | 'expiresAt'> & {
            createdAt: string;
            expiresAt: string;
          };
          cached: boolean;
        };
        // JSON.stringify turns Date into an ISO string on the wire, so
        // revive the two fields before handing them to consumers.
        const diagnosis: Diagnosis = {
          ...raw.diagnosis,
          createdAt: new Date(raw.diagnosis.createdAt),
          expiresAt: new Date(raw.diagnosis.expiresAt),
        };
        setDiagnosis(diagnosis);
        setStatus('success');
        return { diagnosis, cached: raw.cached };
      }

      // Map non-OK responses to friendly errors
      let payloadJson: { error?: string; message?: string; used?: number; limit?: number } = {};
      try {
        payloadJson = await res.json();
      } catch {
        // leave empty
      }

      const fallback = (kind: DiagnoseErrorKind['kind'], message: string) =>
        ({ kind, message }) as DiagnoseErrorKind;

      let err: DiagnoseErrorKind;
      switch (res.status) {
        case 401:
          err = fallback('unauthorized', 'Session expired. Sign in again.');
          break;
        case 400:
          err = fallback('bad_request', payloadJson.message ?? 'Bad request.');
          break;
        case 429:
          err = {
            kind: 'daily_limit',
            message:
              payloadJson.message ??
              'Daily AI diagnosis limit reached. Resets at midnight in your timezone.',
            used: payloadJson.used,
            limit: payloadJson.limit,
          };
          break;
        case 503:
          err = fallback(
            'budget_exceeded',
            payloadJson.message ??
              'AI diagnosis is paused for the month. The rule-based verdict above is still accurate.',
          );
          break;
        case 502:
          err = fallback(
            'upstream',
            payloadJson.message ?? 'AI service temporarily unavailable. Try again in a moment.',
          );
          break;
        case 504:
          err = fallback(
            'timeout',
            payloadJson.message ??
              'AI took too long. Try again — usually faster on retry.',
          );
          toast.error('AI took too long. Try again — usually faster on retry.');
          break;
        default:
          err = fallback('internal', payloadJson.message ?? 'Something went wrong. Try again.');
      }

      setError(err);
      setStatus('error');
      return null;
    },
    [],
  );

  return {
    diagnose,
    loading: status === 'loading',
    error,
    diagnosis,
    status,
    reset,
  };
}
