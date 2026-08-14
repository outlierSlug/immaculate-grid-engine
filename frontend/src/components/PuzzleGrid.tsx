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
}

export default function PuzzleGrid({
  rowLabels,
  colLabels,
  filledCells,
  onCellClick,
  sideColumn,
  locked,
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

            return (
              <button
                key={cellKey}
                onClick={() => onCellClick(rowIndex, colIndex)}
                disabled={!!filled || locked}
                className="border border-gray-300 bg-white flex flex-col items-center justify-center hover:bg-gray-50 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed"
              >
                {filled ? (
                  <>
                    <img src={filled.imageUrl} alt={filled.displayName} className="w-16 h-16 object-cover rounded" />
                    <span className="text-xs font-semibold mt-1 text-center px-1">{filled.displayName}</span>
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
