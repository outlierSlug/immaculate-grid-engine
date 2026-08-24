import { CELL_SIZE } from '../utils/gridSizing';
import type { CellStats } from '../types/puzzle';

interface PuzzleStatsBoardProps {
  rowCount: number;
  colCount: number;
  perCell: Record<string, CellStats>;
  // 'most' shows each cell's top pick, 'least' shows its bottom pick — same
  // underlying per-cell distribution, just read from the other end.
  mode: 'most' | 'least';
  onCellClick: (cellKey: string) => void;
  avatarShapeClass: string;
  // Admin-only: how many characters are a valid answer for each cell,
  // shown as a small top-left badge (the top-right corner is already the
  // pick's own % badge). Undefined for every real player-facing usage of
  // this board (PuzzleStatsPanel never passes it) - revealing "how many
  // valid answers exist" would spoil a puzzle a player hasn't necessarily
  // solved every cell of yet.
  cellAnswerCounts?: Record<string, number>;
}

// Deliberately no row/col category chips here (unlike PuzzleGrid) — this
// board sits directly under the Most/Least Common toggle, already in the
// context of "today's puzzle" above it, so repeating the category labels
// just added width without adding information. Keeps this a plain, centered
// 3x3 grid instead.
export default function PuzzleStatsBoard({
  rowCount,
  colCount,
  perCell,
  mode,
  onCellClick,
  avatarShapeClass,
  cellAnswerCounts,
}: PuzzleStatsBoardProps) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${colCount}, ${CELL_SIZE})`,
        gridTemplateRows: `repeat(${rowCount}, ${CELL_SIZE})`,
      }}
    >
      {Array.from({ length: rowCount }).map((_, rowIndex) =>
        Array.from({ length: colCount }).map((_, colIndex) => {
          const cellKey = `${rowIndex}-${colIndex}`;
          const answers = perCell[cellKey]?.answers ?? [];
          const answer = answers.length > 0 ? (mode === 'most' ? answers[0] : answers[answers.length - 1]) : null;
          const answerCount = cellAnswerCounts?.[cellKey];

          return (
            <button
              key={cellKey}
              type="button"
              onClick={() => onCellClick(cellKey)}
              disabled={!answer}
              className="relative border border-gray-300 dark:border-gray-700 focus-ring-inset bg-white dark:bg-gray-900 flex flex-col items-center justify-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:hover:bg-white dark:disabled:hover:bg-gray-900 cursor-pointer disabled:cursor-default"
            >
              {answerCount != null && (
                <span
                  className={`absolute top-1 left-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-lg font-semibold text-xs leading-tight ${
                    answerCount === 0
                      ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}
                  title="Valid answers for this cell"
                >
                  {answerCount}
                </span>
              )}
              {answer ? (
                <>
                  <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-semibold text-xs leading-tight">
                    {answer.percent > 0 && answer.percent < 1 ? '<1' : Math.round(answer.percent)}%
                  </span>
                  <img
                    src={answer.imageUrl ?? undefined}
                    alt={answer.displayName}
                    className={`w-(--grid-avatar) h-(--grid-avatar) ${avatarShapeClass} object-cover border border-gray-200 dark:border-gray-700 shadow-sm`}
                  />
                  <span className="inline-flex items-center justify-center text-center px-1.5 sm:px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-semibold text-(length:--grid-avatar-label) leading-tight max-w-[92%] wrap-break-word">
                    {answer.displayName}
                  </span>
                </>
              ) : (
                <span className="text-xs text-gray-300 dark:text-gray-600">No data yet</span>
              )}
            </button>
          );
        })
      )}
    </div>
  );
}
