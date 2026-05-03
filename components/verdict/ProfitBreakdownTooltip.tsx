'use client';

import * as React from 'react';
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { profitTone, TONE_TEXT_CLASS } from '@/lib/utils/threshold-color';
import type { ProfitBreakdown } from '@/lib/metrics/profitWithFees';
import { hasAnyFees } from '@/lib/metrics/profitWithFees';
import type { ProductFees } from '@/types/product';

interface ProfitBreakdownTooltipProps {
  fees?: ProductFees;
  breakdown: ProfitBreakdown;
  spend: number;
  cogs: number;
  children: React.ReactNode;
}

export function ProfitBreakdownTooltip({
  fees,
  breakdown,
  spend,
  cogs,
  children,
}: ProfitBreakdownTooltipProps) {
  if (!fees || !hasAnyFees(fees)) {
    return <>{children}</>;
  }

  const showShipping = (fees.shippingCost ?? 0) > 0;
  const showRefunds = (fees.refundRate ?? 0) > 0;
  const showTxFees =
    (fees.transactionFeePercent ?? 0) > 0 || (fees.transactionFeeFixed ?? 0) > 0;

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger
        render={(p) => (
          <span
            {...p}
            className="cursor-help underline decoration-dotted decoration-text-subtle underline-offset-4"
          >
            {children}
          </span>
        )}
      />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner sideOffset={8}>
          <TooltipPrimitive.Popup
            className="z-50 min-w-[15rem] rounded-md border border-border bg-elevated p-3 text-caption shadow-lg data-[open]:animate-in data-[open]:fade-in-0 data-[closed]:animate-out data-[closed]:fade-out-0"
          >
            <BreakdownLine
              label="Revenue"
              value={formatCurrency(breakdown.grossRevenue)}
            />
            {showTxFees && (
              <BreakdownLine
                label="− Tx fees"
                value={`−${formatCurrency(breakdown.transactionFees)}`}
              />
            )}
            {showShipping && (
              <BreakdownLine
                label="− Shipping"
                value={`−${formatCurrency(breakdown.shippingTotal)}`}
              />
            )}
            {showRefunds && (
              <BreakdownLine
                label="− Refunds est"
                value={`−${formatCurrency(breakdown.expectedRefunds)}`}
              />
            )}
            <Divider />
            <BreakdownLine
              label="Net revenue"
              value={formatCurrency(breakdown.netRevenue)}
              emphasize
            />
            <BreakdownLine label="− Ad spend" value={`−${formatCurrency(spend)}`} />
            <BreakdownLine label="− COGS" value={`−${formatCurrency(cogs)}`} />
            <Divider />
            <BreakdownLine
              label="Profit"
              value={formatCurrency(breakdown.profit)}
              valueClass={TONE_TEXT_CLASS[profitTone(breakdown.profit)]}
              emphasize
            />
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

function BreakdownLine({
  label,
  value,
  valueClass,
  emphasize = false,
}: {
  label: string;
  value: string;
  valueClass?: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-0.5">
      <span className={emphasize ? 'text-text' : 'text-text-muted'}>{label}</span>
      <span
        className={`text-mono tabular-nums ${valueClass ?? (emphasize ? 'text-text' : 'text-text')}`}
      >
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="my-1 h-px bg-border-subtle" />;
}
