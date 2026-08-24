import { Fragment } from 'react';
import CategoryChip from './CategoryChip';
import { CELL_SIZE, HEADER_ROW_SIZE, LABEL_COL_SIZE } from '../utils/gridSizing';
import type { CategoryOption } from '../types/puzzle';

interface AdminPuzzlePreviewGridProps {
  // null slots only ever occur in Build Manually mode, before that header
  // has been chosen - Curate/candidate/pinned views always pass 3 real
  // categories on each side.
  rowCategories: (CategoryOption | null)[];
  colCategories: (CategoryOption | null)[];
  // Missing/undefined key -> "—" (row or col not both set yet, Build
  // Manually only). 0 -> a genuinely impossible pairing, styled red. Any
  // other value -> the live valid-answer count.
  cellAnswerCounts?: Record<string, number>;
  // Present only in Build Manually mode - clicking an empty/set header
  // opens the category picker for that slot.
  onHeaderClick?: (side: 'row' | 'col', index: number) => void;
  // Only called for a cell with a defined, nonzero count - nothing useful
  // to show for "—" or a genuine 0.
  onCellClick?: (cellKey: string) => void;
}

// Same visual language PuzzleGrid/PuzzleStatsBoard already use (CategoryChip,
// the shared gridSizing.ts tokens) but deliberately not PuzzleGrid itself or
// a prop-flag variant of it - PuzzleGrid is tightly coupled to gameplay
// (locked state, guess feedback flash, filled-character avatars, guess-input
// wiring), none of which applies to an admin preview. What's shared here is
// the look, not PuzzleGrid's internal logic - closer in spirit to
// PuzzleStatsBoard (a sizing-token sibling), just with the row/col chip
// headers PuzzleStatsBoard omits (nothing else on an admin page already
// shows the categories the way PuzzleStatsBoard's live board above it does).
export default function AdminPuzzlePreviewGrid({
  rowCategories,
  colCategories,
  cellAnswerCounts,
  onHeaderClick,
  onCellClick,
}: AdminPuzzlePreviewGridProps) {
  return (
    <div
      className="grid mx-auto w-fit"
      style={{
        gridTemplateColumns: `${LABEL_COL_SIZE} repeat(${colCategories.length}, ${CELL_SIZE})`,
        gridTemplateRows: `${HEADER_ROW_SIZE} repeat(${rowCategories.length}, ${CELL_SIZE})`,
      }}
    >
      <div />

      {colCategories.map((category, colIndex) => (
        <div key={`col-${colIndex}`} className="flex items-center justify-center p-2">
          <HeaderSlot category={category} onClick={onHeaderClick ? () => onHeaderClick('col', colIndex) : undefined} />
        </div>
      ))}

      {rowCategories.map((rowCategory, rowIndex) => (
        <Fragment key={`row-${rowIndex}`}>
          <div className="flex items-center justify-center p-2">
            <HeaderSlot category={rowCategory} onClick={onHeaderClick ? () => onHeaderClick('row', rowIndex) : undefined} />
          </div>

          {colCategories.map((_, colIndex) => {
            const cellKey = `${rowIndex}-${colIndex}`;
            const count = cellAnswerCounts?.[cellKey];
            const isZero = count === 0;
            const isClickable = !!onCellClick && count != null && count > 0;

            return (
              <button
                key={cellKey}
                type="button"
                onClick={isClickable ? () => onCellClick!(cellKey) : undefined}
                disabled={!isClickable}
                className={`relative border focus-ring-inset transition-colors duration-200 flex items-center justify-center cursor-pointer disabled:cursor-default ${
                  isZero
                    ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30'
                    : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:hover:bg-white dark:disabled:hover:bg-gray-900'
                }`}
              >
                {count == null ? (
                  <span className="text-gray-300 dark:text-gray-600 text-sm">—</span>
                ) : (
                  <span
                    className={`absolute top-1.5 right-1.5 inline-flex items-center justify-center px-1.5 py-0.5 rounded-lg font-semibold text-xs leading-tight ${
                      isZero
                        ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}

function HeaderSlot({ category, onClick }: { category: CategoryOption | null; onClick?: () => void }) {
  if (category) {
    return onClick ? (
      <button type="button" onClick={onClick} className="cursor-pointer">
        <CategoryChip label={category.label} />
      </button>
    ) : (
      <CategoryChip label={category.label} />
    );
  }

  // Only reachable in Build Manually mode - onClick is always set whenever
  // a category can legitimately be null.
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex flex-col items-center justify-center text-center px-2 py-1.5 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold text-xs leading-tight cursor-pointer"
    >
      + Choose
      <br />
      category
    </button>
  );
}
