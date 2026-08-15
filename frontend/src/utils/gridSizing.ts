// Shared fluid sizing for every place a puzzle grid gets laid out
// (PuzzleGrid, PuzzleStatsBoard, PuzzleStatsPanel's matching-width stat
// card, UnlimitedPage's button-row alignment). clamp(min, preferred, max)
// keeps the exact original fixed-rem desktop size (the max) while shrinking
// fluidly on narrow viewports instead of overflowing — a 3x3 grid at the
// old fixed 7rem/8rem sizing totals 38rem (608px), wider than any phone.
// The vw percentages were picked so the whole grid comfortably fits a
// 375px-wide viewport (iPhone SE, the narrowest realistic target) with
// room to spare, verified against a 430px iPhone 15 Pro Max viewport too.
export const CELL_SIZE = 'clamp(4.25rem, 21vw, 8rem)';
export const LABEL_COL_SIZE = 'clamp(2.75rem, 13vw, 7rem)';
export const HEADER_ROW_SIZE = 'clamp(3.5rem, 15vw, 6rem)';

// Three CELL_SIZE columns, no label columns — matches PuzzleStatsBoard's
// (label-free) width, and reused by PuzzleStatsPanel to size its stat card
// to the same fluid width so the two read as one aligned column.
export const BOARD_WIDTH_CSS = `calc(3 * ${CELL_SIZE})`;
