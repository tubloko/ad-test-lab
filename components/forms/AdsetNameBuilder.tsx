'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FunnelStage } from '@/types/adset';

interface AdsetNameBuilderProps {
  productName: string;
  funnelStage: FunnelStage;
  audience: string | undefined;
  budget: number | undefined;
  onApply: (name: string) => void;
}

export function AdsetNameBuilder({
  productName,
  funnelStage,
  audience,
  budget,
  onApply,
}: AdsetNameBuilderProps) {
  const [open, setOpen] = useState(false);
  const [prefix, setPrefix] = useState('SA');

  const built = [
    prefix,
    funnelStage,
    productName.trim() || 'product',
    (audience ?? '').trim() || 'audience',
    budget && budget > 0 ? `${budget}$` : 'budget$',
  ].join(' | ');

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
        {open ? 'Hide name builder' : 'Build name'}
      </Button>

      {open && (
        <div className="space-y-3 rounded-md border border-border bg-elevated p-3">
          <div className="space-y-1.5">
            <Label htmlFor="namePrefix">Prefix</Label>
            <Input
              id="namePrefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="rounded-sm border border-border-subtle bg-surface px-2 py-1.5 text-mono text-text-muted">
            {built}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onApply(built);
              setOpen(false);
            }}
          >
            Use this name
          </Button>
        </div>
      )}
    </div>
  );
}
