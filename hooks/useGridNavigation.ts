'use client';

import { useCallback, useRef, type KeyboardEvent } from 'react';

/**
 * Spreadsheet-style cell navigation for an inline-editable table.
 *
 * - Tab / Shift+Tab → next / previous cell on the same row
 * - Enter / Shift+Enter → next / previous cell in the same column
 * - Esc → blur, restore initial value (caller's job to actually revert)
 * - Cmd/Ctrl+Enter → save and stay (caller's job to save)
 * - Arrow keys are NOT hijacked while typing inside an input — that would
 *   break native cursor movement. The caller can opt into arrow-key cell
 *   movement by checking `e.currentTarget.selectionStart === 0` etc.
 *
 * Caller wires it up by:
 *   1. Calling getRef(row, col) for every input's `ref` prop.
 *   2. Calling onKeyDown(row, col)(event) on every input's `onKeyDown`.
 *   3. Optionally calling focusCell(row, col) to programmatically jump.
 *
 * Coordinates are caller-defined — typically row = entry index (0 = top
 * "today" row, 1..N = existing entries) and col = field index in the row.
 */
export interface GridNavigation {
  getRef: (row: number, col: number) => (el: HTMLInputElement | null) => void;
  onKeyDown: (
    row: number,
    col: number,
  ) => (event: KeyboardEvent<HTMLInputElement>) => void;
  focusCell: (row: number, col: number) => void;
}

interface UseGridNavigationArgs {
  rowCount: number;
  colCount: number;
  /** Optional save handler called on Cmd/Ctrl+Enter. */
  onSave?: (row: number, col: number) => void;
  /** Optional escape handler — called when user hits Esc. */
  onEscape?: (row: number, col: number) => void;
}

export function useGridNavigation({
  rowCount,
  colCount,
  onSave,
  onEscape,
}: UseGridNavigationArgs): GridNavigation {
  const refs = useRef<Map<string, HTMLInputElement>>(new Map());

  const key = (row: number, col: number) => `${row}:${col}`;

  const focusCell = useCallback(
    (row: number, col: number) => {
      const el = refs.current.get(key(row, col));
      if (el) {
        el.focus();
        el.select();
      }
    },
    [],
  );

  const getRef = useCallback(
    (row: number, col: number) => (el: HTMLInputElement | null) => {
      const k = key(row, col);
      if (el) refs.current.set(k, el);
      else refs.current.delete(k);
    },
    [],
  );

  const onKeyDown = useCallback(
    (row: number, col: number) =>
      (event: KeyboardEvent<HTMLInputElement>) => {
        const isTab = event.key === 'Tab';
        const isEnter = event.key === 'Enter';
        const isEsc = event.key === 'Escape';

        if (isTab) {
          event.preventDefault();
          const nextCol = event.shiftKey ? col - 1 : col + 1;
          if (nextCol >= 0 && nextCol < colCount) {
            focusCell(row, nextCol);
          } else {
            // wrap to next/prev row
            const nextRow = event.shiftKey ? row - 1 : row + 1;
            if (nextRow >= 0 && nextRow < rowCount) {
              focusCell(nextRow, event.shiftKey ? colCount - 1 : 0);
            }
          }
          return;
        }

        if (isEnter) {
          if ((event.metaKey || event.ctrlKey) && onSave) {
            event.preventDefault();
            onSave(row, col);
            return;
          }
          event.preventDefault();
          const nextRow = event.shiftKey ? row - 1 : row + 1;
          if (nextRow >= 0 && nextRow < rowCount) {
            focusCell(nextRow, col);
          }
          return;
        }

        if (isEsc) {
          event.preventDefault();
          onEscape?.(row, col);
          event.currentTarget.blur();
          return;
        }
      },
    [colCount, rowCount, focusCell, onSave, onEscape],
  );

  return { getRef, onKeyDown, focusCell };
}
