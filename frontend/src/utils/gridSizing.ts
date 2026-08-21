// Shared fluid sizing for every place a puzzle grid gets laid out
// (PuzzleGrid, PuzzleStatsBoard, PuzzleStatsPanel's matching-width stat
// card, UnlimitedPage's button-row alignment). The actual clamp() values
// live in index.css (:root) — these just reference them, so both plain
// inline-style consumers (this file's own usages) and Tailwind responsive
// arbitrary-property consumers (PuzzleGrid/UnlimitedPage's mobile
// no-side-column layout) share one source of truth.
export const CELL_SIZE = 'var(--grid-cell)';
export const LABEL_COL_SIZE = 'var(--grid-label)';
export const HEADER_ROW_SIZE = 'var(--grid-header)';

// Three CELL_SIZE columns, no label columns — matches PuzzleStatsBoard's
// (label-free) width, and reused by PuzzleStatsPanel to size its stat card
// to the same fluid width so the two read as one aligned column.
export const BOARD_WIDTH_CSS = `calc(3 * ${CELL_SIZE})`;
