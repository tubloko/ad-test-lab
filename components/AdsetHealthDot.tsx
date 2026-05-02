import { cn } from '@/lib/utils';
import type { AdsetHealth } from '@/lib/utils/adset-health';

interface AdsetHealthDotProps {
  health: AdsetHealth;
  className?: string;
}

const TONE_CLASS: Record<AdsetHealth, string> = {
  healthy: 'bg-success-text',
  warning: 'bg-warning-text',
  critical: 'bg-danger-text',
  'no-data': 'bg-text-subtle',
};

const TITLE: Record<AdsetHealth, string> = {
  healthy: 'All funnel metrics healthy',
  warning: '1 metric below threshold',
  critical: '2+ metrics below threshold',
  'no-data': 'No data in selected range',
};

export function AdsetHealthDot({ health, className }: AdsetHealthDotProps) {
  return (
    <span
      role="status"
      aria-label={TITLE[health]}
      title={TITLE[health]}
      className={cn(
        'inline-block size-2.5 shrink-0 rounded-full',
        TONE_CLASS[health],
        className,
      )}
    />
  );
}
