import CategoryChip from './CategoryChip';
import type { GridItem } from '../types/puzzle';

interface PuzzleGridProps {
  rowLabels: string[];
  colLabels: string[];
  filledCells: Record<string, GridItem>; // key: "row-col", e.g. "0-0"
  onCellClick: (row: number, col: number) => void;
}

export default function PuzzleGrid({ rowLabels, colLabels, filledCells, onCellClick }: PuzzleGridProps) {
  return (
    <div className="inline-block">
      {/* column headers row, offset to leave room for row headers on the left */}
      <div className="flex">
        <div className="w-28" /> {/* spacer matching row header width */}
        {colLabels.map((label) => (
          <div key={label} className="w-32 flex items-center justify-center p-2">
            <CategoryChip label={label} />
          </div>
        ))}
      </div>

      {rowLabels.map((rowLabel, rowIndex) => (
        <div key={rowLabel} className="flex">
          <div className="w-28 flex items-center justify-center p-2">
            <CategoryChip label={rowLabel} />
          </div>

          {colLabels.map((_, colIndex) => {
            const cellKey = `${rowIndex}-${colIndex}`;
            const filled = filledCells[cellKey];

            return (
              <button
                key={cellKey}
                onClick={() => onCellClick(rowIndex, colIndex)}
                disabled={!!filled}
                className="w-32 h-32 border border-gray-300 bg-white flex flex-col items-center justify-center hover:bg-gray-50 disabled:hover:bg-white"
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
        </div>
      ))}
    </div>
  );
}