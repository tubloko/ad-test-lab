import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { ADSET_GRID_COLUMNS } from '@/components/tables/AdsetEntriesTable.shared';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatPercent } from '@/lib/utils/formatPercent';
import {
  rateTone,
  HEALTHY_LPV_RATE,
  HEALTHY_ATC_RATE,
  HEALTHY_IC_FROM_LPV,
  HEALTHY_CONV_FROM_LPV,
  TONE_TEXT_CLASS,
} from '@/lib/utils/threshold-color';
import { THRESHOLDS } from '@/lib/verdict-engine';
import { cn } from '@/lib/utils';
import type { AdsetTotals } from '@/lib/metrics/adsetTotals';

interface AdsetTotalsRowProps {
  totals: AdsetTotals;
}

/**
 * Always-visible totals strip rendered above the (collapsible) daily-entries
 * table inside an accordion item. Column widths are pinned by the shared
 * ADSET_GRID_COLUMNS so the row aligns with the table below when expanded
 * — no flicker on toggle.
 */
export function AdsetTotalsRow({ totals }: AdsetTotalsRowProps) {
  const dash = '—';
  const has = totals.hasData;
  const ctrTracked = totals.totalImpressions > 0;

  return (
    <div className="overflow-x-auto bg-elevated">
      <Table className="table-fixed">
        <colgroup>
          {ADSET_GRID_COLUMNS.map((c) => (
            <col key={c.key} style={{ width: `${c.width}px` }} />
          ))}
        </colgroup>
        <TableBody>
          <TableRow className="hover:bg-transparent">
            <TableCell className="text-subheading text-text">Total</TableCell>
            <TableCell className="text-right text-mono text-text">
              {has ? formatCurrency(totals.totalSpend) : dash}
            </TableCell>
            <TableCell className="text-right text-mono text-text">
              {has ? totals.totalClicks : dash}
            </TableCell>
            <TableCell className="text-right text-mono text-text">
              {has ? totals.totalLPV : dash}
            </TableCell>
            <TableCell className="text-right text-mono text-text">
              {has ? totals.totalATC : dash}
            </TableCell>
            <TableCell className="text-right text-mono text-text">
              {has ? totals.totalIC : dash}
            </TableCell>
            <TableCell className="text-right text-mono text-text">
              {has ? totals.totalPurchases : dash}
            </TableCell>
            <TableCell className="text-right text-mono text-text">
              {has && totals.totalClicks > 0 ? formatCurrency(totals.cpc) : dash}
            </TableCell>
            <TableCell
              className={cn(
                'text-right text-mono',
                ctrTracked
                  ? TONE_TEXT_CLASS[rateTone(totals.ctr, THRESHOLDS.HEALTHY_CTR)]
                  : 'text-text-muted',
              )}
              title={
                ctrTracked
                  ? undefined
                  : 'CTR needs impressions, which we don’t track yet'
              }
            >
              {ctrTracked ? formatPercent(totals.ctr) : dash}
            </TableCell>
            <TableCell
              className={cn(
                'text-right text-mono',
                has && totals.totalClicks > 0
                  ? TONE_TEXT_CLASS[rateTone(totals.lpvRate, HEALTHY_LPV_RATE)]
                  : 'text-text-muted',
              )}
            >
              {has && totals.totalClicks > 0 ? formatPercent(totals.lpvRate) : dash}
            </TableCell>
            <TableCell
              className={cn(
                'text-right text-mono',
                has && totals.totalLPV > 0
                  ? TONE_TEXT_CLASS[rateTone(totals.atcRate, HEALTHY_ATC_RATE)]
                  : 'text-text-muted',
              )}
            >
              {has && totals.totalLPV > 0 ? formatPercent(totals.atcRate) : dash}
            </TableCell>
            <TableCell
              className={cn(
                'text-right text-mono',
                has && totals.totalLPV > 0
                  ? TONE_TEXT_CLASS[rateTone(totals.icRate, HEALTHY_IC_FROM_LPV)]
                  : 'text-text-muted',
              )}
            >
              {has && totals.totalLPV > 0 ? formatPercent(totals.icRate) : dash}
            </TableCell>
            <TableCell
              className={cn(
                'text-right text-mono',
                has && totals.totalLPV > 0
                  ? TONE_TEXT_CLASS[rateTone(totals.purchaseRate, HEALTHY_CONV_FROM_LPV)]
                  : 'text-text-muted',
              )}
            >
              {has && totals.totalLPV > 0 ? formatPercent(totals.purchaseRate) : dash}
            </TableCell>
            <TableCell />
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
