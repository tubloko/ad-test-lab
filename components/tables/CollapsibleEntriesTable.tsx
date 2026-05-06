'use client';

import type { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableHeader,
} from '@/components/ui/table';

interface CollapsibleEntriesTableProps {
  /** Always-rendered today row (a `<tr>` or fragment of `<tr>`s). */
  todayRow: ReactNode;
  /** Historical rows, sorted DESC, rendered only when expanded. */
  historicalRows: ReactNode;
  /** Column header row (a single `<tr>`). Rendered inside `<thead>`. */
  header: ReactNode;
  /** Whether to render historical rows. The toggle button lives in the parent. */
  expanded: boolean;
}

export function CollapsibleEntriesTable({
  todayRow,
  historicalRows,
  header,
  expanded,
}: CollapsibleEntriesTableProps) {
  return (
    <Table className="[&_th]:h-9 [&_td]:py-2">
      <TableHeader>{header}</TableHeader>
      <TableBody>
        {todayRow}
        {expanded && historicalRows}
      </TableBody>
    </Table>
  );
}
