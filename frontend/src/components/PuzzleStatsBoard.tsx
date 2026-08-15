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
}

// Deliberately no row/col category chips here (unlike PuzzleGrid) — this
// board sits directly under the Most/Least Common toggle, already in the
// context of "today's puzzle" above it, so repeating the category labels
// just added width without adding information. Keeps this a plain, centered
// 3x3 grid instead.
export default function PuzzleStatsBoard({ rowCount, colCount, perCell, mode, onCellClick }: PuzzleStatsBoardProps) {
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

          return (
            <button
              key={cellKey}
              type="button"
              onClick={() => onCellClick(cellKey)}
              disabled={!answer}
              className="relative border border-gray-300 bg-white flex flex-col items-center justify-center gap-1.5 hover:bg-gray-50 disabled:hover:bg-white cursor-pointer disabled:cursor-default"
            >
              {answer ? (
                <>
                  <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-lg bg-gray-100 text-gray-800 font-semibold text-xs leading-tight">
                    {answer.percent > 0 && answer.percent < 1 ? '<1' : Math.round(answer.percent)}%
                  </span>
                  <img
                    src={answer.imageUrl ?? undefined}
                    alt={answer.displayName}
                    className="w-11 h-11 sm:w-16 sm:h-16 rounded-full object-cover border border-gray-200 shadow-sm"
                  />
                  <span className="inline-flex items-center justify-center text-center px-1.5 sm:px-2 py-0.5 rounded-lg bg-gray-100 text-gray-800 font-semibold text-[10px] sm:text-xs leading-tight max-w-[92%] wrap-break-word">
                    {answer.displayName}
                  </span>
                </>
              ) : (
                <span className="text-xs text-gray-300">No data yet</span>
              )}
            </button>
          );
        })
      )}
    </div>
  );
}
