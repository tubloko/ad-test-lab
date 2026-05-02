import { Badge } from '@/components/ui/badge';
import type { ProductStatus } from '@/types/product';
import type { AdsetStatus } from '@/types/adset';

type Status = ProductStatus | AdsetStatus;

const VARIANT: Record<Status, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  testing: 'outline',
  scaled: 'default',
  active: 'default',
  paused: 'secondary',
  killed: 'destructive',
};

interface StatusBadgeProps {
  status: Status;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={VARIANT[status]}>{status}</Badge>;
}
