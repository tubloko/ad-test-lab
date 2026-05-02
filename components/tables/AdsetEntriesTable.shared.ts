/**
 * Single source of truth for adset-table column widths. Both
 * AdsetEntriesTable (the daily editing grid) and AdsetTotalsRow (the
 * always-visible totals strip in the accordion) use these widths so
 * columns line up pixel-for-pixel between the two — and so column
 * widths don't shift when the accordion expands or collapses.
 *
 * Widths are pinned via `<colgroup><col style={{ width }} /></colgroup>`
 * on each `<table>` plus `table-fixed` on the `<table>` element.
 */
export const ADSET_GRID_COLUMNS = [
  { key: 'date', width: 168 },
  { key: 'spend', width: 112 },
  { key: 'clicks', width: 96 },
  { key: 'lpv', width: 96 },
  { key: 'atc', width: 96 },
  { key: 'ic', width: 96 },
  { key: 'purchases', width: 112 },
  { key: 'cpc', width: 84 },
  { key: 'ctr', width: 80 },
  { key: 'lpvRate', width: 80 },
  { key: 'atcRate', width: 80 },
  { key: 'icRate', width: 80 },
  { key: 'convRate', width: 80 },
  { key: 'status', width: 32 },
  { key: 'delete', width: 40 },
] as const;

export type AdsetColumnKey = (typeof ADSET_GRID_COLUMNS)[number]['key'];

export const ADSET_COLUMN_COUNT = ADSET_GRID_COLUMNS.length;
