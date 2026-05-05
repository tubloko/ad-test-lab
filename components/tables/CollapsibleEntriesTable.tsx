'use client';

import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableHeader,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useExpandedTable } from '@/hooks/useExpandedTable';
import { cn } from '@/lib/utils';

interface CollapsibleEntriesTableProps {
  /** Always-rendered today row (a `<tr>` or fragment of `<tr>`s). */
  todayRow: ReactNode;
  /** Historical rows, sorted DESC, rendered only when expanded. */
  historicalRows: ReactNode;
  /** Column header row (a single `<tr>`). Rendered inside `<thead>`. */
  header: ReactNode;
  /** Optional toolbar content to the right of the toggle (e.g. backfill button). */
  toolbar?: ReactNode;
  /** Number of historical rows — drives the toggle label and visibility. */
  historicalCount: number;
  /** Unique key for this table in the URL ?expanded= param. */
  storageKey: string;
}

export function CollapsibleEntriesTable({
  todayRow,
  historicalRows,
  header,
  toolbar,
  historicalCount,
  storageKey,
}: CollapsibleEntriesTableProps) {
  const { expanded, toggle } = useExpandedTable(storageKey);
  const showToggle = historicalCount > 0;
  const dayLabel = `${historicalCount} ${
    historicalCount === 1 ? 'day' : 'days'
  }`;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border-subtle px-3 py-2">
        {showToggle ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Hide' : 'Show'} ${historicalCount} historical ${historicalCount === 1 ? 'day' : 'days'}`}
            onClick={toggle}
          >
            <ChevronDown
              className={cn(
                'size-4 transition-transform duration-200 ease-out',
                expanded ? 'rotate-0' : '-rotate-90',
              )}
            />
            {expanded ? 'Hide' : 'Show'} {dayLabel}
          </Button>
        ) : (
          <span aria-hidden className="block h-8" />
        )}
        {toolbar && (
          <div className="flex items-center gap-2">{toolbar}</div>
        )}
      </div>

      <Table>
        <TableHeader>{header}</TableHeader>
        <TableBody>
          {todayRow}
          {expanded && historicalRows}
        </TableBody>
      </Table>
    </div>
  );
}
