import type { VerdictType } from '@/lib/verdict-engine';

export type VerdictTone = 'success' | 'warning' | 'danger' | 'info';

export const verdictTone: Record<VerdictType, VerdictTone> = {
  CONTINUE: 'success',
  FIX_CREATIVE: 'warning',
  FIX_LP: 'warning',
  FIX_OFFER: 'warning',
  CHECKOUT_ISSUE: 'warning',
  KILL: 'danger',
  NEED_MORE_DATA: 'info',
};

export const verdictLabel: Record<VerdictType, string> = {
  CONTINUE: 'Continue',
  KILL: 'Kill this test',
  FIX_CREATIVE: 'Fix creative',
  FIX_LP: 'Fix landing page',
  FIX_OFFER: 'Fix offer',
  CHECKOUT_ISSUE: 'Checkout issue',
  NEED_MORE_DATA: 'Need more data',
};
