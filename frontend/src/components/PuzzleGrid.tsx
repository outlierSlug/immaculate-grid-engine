import { Fragment, type ReactNode } from 'react';
import CategoryChip from './CategoryChip';
import type { GridItem } from '../types/puzzle';

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
}

export default function PuzzleGrid({
  rowLabels,
  colLabels,
  filledCells,
  onCellClick,
  sideColumn,
  locked,
  feedback,
}: PuzzleGridProps) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `7rem repeat(${colLabels.length}, 8rem) 7rem`,
        gridTemplateRows: `6rem repeat(${rowLabels.length}, 8rem)`,
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
                    {/* Reserved for a future per-cell answer-rarity badge
                        (Phase 6) — no real data to show yet, so nothing
                        renders here for now. */}
                    <img
                      src={filled.imageUrl}
                      alt={filled.displayName}
                      className="w-16 h-16 rounded-full object-cover border border-gray-200 shadow-sm"
                    />
                    <span className="inline-flex items-center justify-center text-center px-2 py-0.5 rounded-lg bg-gray-100 text-gray-800 font-semibold text-xs leading-tight max-w-[92%] wrap-break-word">
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
