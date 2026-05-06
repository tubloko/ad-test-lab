import {
  XCircle,
  Image,
  Layout,
  Tag,
  CreditCard,
  CheckCircle2,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import type { VerdictType } from '@/lib/verdict-engine';
import { verdictLabel, verdictTone, type VerdictTone } from '@/lib/utils/verdict-colors';
import { cn } from '@/lib/utils';

interface VerdictBadgeProps {
  verdict: VerdictType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ICON: Record<VerdictType, LucideIcon> = {
  KILL: XCircle,
  FIX_CREATIVE: Image,
  FIX_LP: Layout,
  FIX_OFFER: Tag,
  CHECKOUT_ISSUE: CreditCard,
  CONTINUE: CheckCircle2,
  NEED_MORE_DATA: Clock,
};

const TONE_CLASS: Record<VerdictTone, string> = {
  success: 'bg-success-bg/10 text-success-text border-success-border/40',
  warning: 'bg-warning-bg/10 text-warning-text border-warning-border/40',
  danger: 'bg-danger-bg/10 text-danger-text border-danger-border/40',
  info: 'bg-info-bg/10 text-info-text border-info-border/40',
};

const SIZE_CLASS: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-6 px-2 gap-1 text-caption [&>svg]:size-3',
  md: 'h-8 px-3 gap-1.5 text-body [&>svg]:size-4',
  lg: 'h-10 px-4 gap-2 text-subheading [&>svg]:size-5',
};

export function VerdictBadge({ verdict, size = 'md', className }: VerdictBadgeProps) {
  const Icon = ICON[verdict];
  const tone = verdictTone[verdict];

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full border font-medium',
        TONE_CLASS[tone],
        SIZE_CLASS[size],
        className,
      )}
    >
      <Icon />
      {verdictLabel[verdict]}
    </span>
  );
}
