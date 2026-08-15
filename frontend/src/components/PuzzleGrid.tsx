import { Fragment, type ReactNode } from 'react';
import CategoryChip from './CategoryChip';
import { CELL_SIZE, LABEL_COL_SIZE, HEADER_ROW_SIZE } from '../utils/gridSizing';
import type { CellStats, GridItem } from '../types/puzzle';

interface PuzzleGridProps {
  rowLabels: string[];
  colLabels: string[];
  filledCells: Record<string, GridItem>; // key: "row-col", e.g. "0-0"
  onCellClick: (row: number, col: number) => void;
  // 4th column to the right of the grid, index-aligned with rowLabels (e.g.
  // sideColumn[0] renders beside row 1). Always reserved at the same width as
  // the row-label column — even when empty — so the 3x3 grid's center column
  // stays at the true center of the rendered block regardless of content.
  sideColumn?: ReactNode[];
  // Disables every cell (filled or not) — used once a game-over state
  // (out of guesses, gave up) is reached. The grid has no game-rule
  // knowledge itself; callers decide when this applies.
  locked?: boolean;
  // Most recent guess result, briefly highlighted on the cell it applies to
  // (green border if correct, red if not) instead of a blocking alert().
  // Callers are responsible for clearing this after a short delay.
  feedback?: { row: number; col: number; correct: boolean } | null;
  // Live per-cell answer distributions (Daily only). Never a frozen
  // snapshot — callers re-fetch this on load and after every correct guess,
  // so the same cell's badge can show a different percentage across visits
  // as more players submit results for the puzzle.
  cellStats?: Record<string, CellStats> | null;
}

export default function PuzzleGrid({
  rowLabels,
  colLabels,
  filledCells,
  onCellClick,
  sideColumn,
  locked,
  feedback,
  cellStats,
}: PuzzleGridProps) {
  return (
    <div
      className="grid"
      style={{
        // clamp() so this scales down on narrow viewports instead of
        // overflowing at a fixed 7rem/8rem (38rem = 608px total, wider than
        // any phone) — caps out at the original fixed values on desktop, so
        // nothing changes above ~610px wide.
        gridTemplateColumns: `${LABEL_COL_SIZE} repeat(${colLabels.length}, ${CELL_SIZE}) ${LABEL_COL_SIZE}`,
        gridTemplateRows: `${HEADER_ROW_SIZE} repeat(${rowLabels.length}, ${CELL_SIZE})`,
      }}
    >
      <div />

      {colLabels.map((label) => (
        <div key={label} className="flex items-center justify-center p-2">
          <CategoryChip label={label} />
        </div>
      ))}

      <div />

      {rowLabels.map((rowLabel, rowIndex) => (
        <Fragment key={rowLabel}>
          <div className="flex items-center justify-center p-2">
            <CategoryChip label={rowLabel} />
          </div>

          {colLabels.map((_, colIndex) => {
            const cellKey = `${rowIndex}-${colIndex}`;
            const filled = filledCells[cellKey];
            const rarityPercent = filled
              ? cellStats?.[cellKey]?.answers.find((a) => a.itemId === filled.id)?.percent
              : undefined;
            const isFeedbackCell = feedback?.row === rowIndex && feedback?.col === colIndex;
            // Border width stays at the original 1px in both states — only
            // the color changes during a flash — so the grid lines never
            // get thicker than the rest of the grid (they did briefly when
            // this used border-2 as the "constant" width instead).
            const borderColorClass = isFeedbackCell
              ? feedback!.correct
                ? 'border-green-500'
                : 'border-red-500'
              : 'border-gray-300';

            return (
              <button
                key={cellKey}
                onClick={() => onCellClick(rowIndex, colIndex)}
                disabled={!!filled || locked}
                className={`relative border ${borderColorClass} transition-colors duration-200 bg-white flex flex-col items-center justify-center gap-1.5 hover:bg-gray-50 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed`}
              >
                {filled ? (
                  <>
                    {rarityPercent != null && (
                      <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-lg bg-gray-100 text-gray-800 font-semibold text-xs leading-tight">
                        {rarityPercent > 0 && rarityPercent < 1 ? '<1' : Math.round(rarityPercent)}%
                      </span>
                    )}
                    <img
                      src={filled.imageUrl}
                      alt={filled.displayName}
                      className="w-11 h-11 sm:w-16 sm:h-16 rounded-full object-cover border border-gray-200 shadow-sm"
                    />
                    <span className="inline-flex items-center justify-center text-center px-1.5 sm:px-2 py-0.5 rounded-lg bg-gray-100 text-gray-800 font-semibold text-[10px] sm:text-xs leading-tight max-w-[92%] wrap-break-word">
                      {filled.displayName}
                    </span>
                  </>
                ) : null}
              </button>
            );
          })}

          <div className="flex items-center justify-center">{sideColumn?.[rowIndex] ?? null}</div>
        </Fragment>
      ))}
    </div>
  );
}
