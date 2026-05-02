'use client';

import { useCallback, useRef, type KeyboardEvent } from 'react';

/**
 * Spreadsheet-style cell navigation for an inline-editable table.
 *
 * - Tab / Shift+Tab → next / previous cell on the same row
 * - Enter / Shift+Enter → next / previous cell in the same column
 * - ArrowUp / ArrowDown → previous / next cell in the same column
 * - ArrowLeft / ArrowRight → previous / next cell on the same row
 * - Esc → blur and let the caller revert
 * - Cmd/Ctrl+Enter → save and stay
 *
 * Caveat: arrow keys always navigate cells (no caret movement inside the
 * input). type="number" inputs don't expose selectionStart/End reliably,
 * so boundary detection is unreliable in practice. To edit the middle of
 * a multi-character value, click into it or use Home/End.
 *
 * Caller wires it up by:
 *   1. Calling getRef(row, col) for every input's `ref` prop.
 *   2. Calling onKeyDown(row, col)(event) on every input's `onKeyDown`.
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
        const k = event.key;

        if (k === 'Tab') {
          event.preventDefault();
          const nextCol = event.shiftKey ? col - 1 : col + 1;
          if (nextCol >= 0 && nextCol < colCount) {
            focusCell(row, nextCol);
          } else {
            const nextRow = event.shiftKey ? row - 1 : row + 1;
            if (nextRow >= 0 && nextRow < rowCount) {
              focusCell(nextRow, event.shiftKey ? colCount - 1 : 0);
            }
          }
          return;
        }

        if (k === 'Enter') {
          if ((event.metaKey || event.ctrlKey) && onSave) {
            event.preventDefault();
            onSave(row, col);
            return;
          }
          event.preventDefault();
          const nextRow = event.shiftKey ? row - 1 : row + 1;
          if (nextRow >= 0 && nextRow < rowCount) focusCell(nextRow, col);
          return;
        }

        if (k === 'ArrowUp') {
          event.preventDefault();
          if (row - 1 >= 0) focusCell(row - 1, col);
          return;
        }

        if (k === 'ArrowDown') {
          event.preventDefault();
          if (row + 1 < rowCount) focusCell(row + 1, col);
          return;
        }

        if (k === 'ArrowLeft') {
          event.preventDefault();
          if (col - 1 >= 0) focusCell(row, col - 1);
          else if (row - 1 >= 0) focusCell(row - 1, colCount - 1);
          return;
        }

        if (k === 'ArrowRight') {
          event.preventDefault();
          if (col + 1 < colCount) focusCell(row, col + 1);
          else if (row + 1 < rowCount) focusCell(row + 1, 0);
          return;
        }

        if (k === 'Escape') {
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
