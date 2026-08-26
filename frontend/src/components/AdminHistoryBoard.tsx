import CategoryChip from './CategoryChip';
import PuzzleStatsBoard from './PuzzleStatsBoard';
import { CELL_SIZE, LABEL_COL_SIZE, HEADER_ROW_SIZE } from '../utils/gridSizing';
import type { CategoryOption, CellStats } from '../types/puzzle';
import type { GameId } from '../config/games';

interface AdminHistoryBoardProps {
  game: GameId;
  rowCategories: CategoryOption[];
  colCategories: CategoryOption[];
  perCell: Record<string, CellStats>;
  mode: 'most' | 'least';
  onCellClick: (cellKey: string) => void;
  avatarShapeClass: string;
  avatarAspectClass: string;
  avatarSizeClass: string;
  avatarBorderClass: string;
}

// Read-only fusion of PuzzleGrid's header layout (category chips aligned
// over/beside each column/row) with PuzzleStatsBoard's own cell rendering -
// a past puzzle has no live PuzzleGrid above it already showing the
// categories the way a real Daily/Archive page does, so the History tab
// needs its own header. Every cell is explicitly grid-placed (not relying
// on auto-flow order) so the label column and the embedded PuzzleStatsBoard
// can't accidentally interleave. No trailing balance column here (unlike an
// earlier version of this component) - AdminHistoryPanel handles centering
// at the wrapping level instead, so this board's own right edge stays flush
// with its actual cells, keeping a consistent gap to the AdminGridStats
// panel beside it (same convention AdminPuzzlePreviewGrid already follows).
export default function AdminHistoryBoard({
  game,
  rowCategories,
  colCategories,
  perCell,
  mode,
  onCellClick,
  avatarShapeClass,
  avatarAspectClass,
  avatarSizeClass,
  avatarBorderClass,
}: AdminHistoryBoardProps) {
  // getStatsForAdmin always reveals every valid answer per cell (count 0
  // included), so answers.length IS the true valid-answer count - no
  // separate fetch needed for the top-left badge PuzzleStatsBoard renders.
  const cellAnswerCounts = Object.fromEntries(
    Object.entries(perCell).map(([cellKey, cell]) => [cellKey, cell.answers.length])
  );

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `${LABEL_COL_SIZE} repeat(${colCategories.length}, ${CELL_SIZE})`,
        gridTemplateRows: `${HEADER_ROW_SIZE} repeat(${rowCategories.length}, ${CELL_SIZE})`,
      }}
    >
      {colCategories.map((cat, i) => (
        <div key={cat.id} style={{ gridColumn: i + 2, gridRow: 1 }} className="flex items-center justify-center p-2">
          <CategoryChip label={cat.label} game={game} />
        </div>
      ))}

      {rowCategories.map((cat, i) => (
        <div key={cat.id} style={{ gridColumn: 1, gridRow: i + 2 }} className="flex items-center justify-center p-2">
          <CategoryChip label={cat.label} game={game} />
        </div>
      ))}

      <div style={{ gridColumn: `2 / span ${colCategories.length}`, gridRow: `2 / span ${rowCategories.length}` }}>
        <PuzzleStatsBoard
          rowCount={rowCategories.length}
          colCount={colCategories.length}
          perCell={perCell}
          mode={mode}
          onCellClick={onCellClick}
          avatarShapeClass={avatarShapeClass}
          avatarAspectClass={avatarAspectClass}
          avatarSizeClass={avatarSizeClass}
          avatarBorderClass={avatarBorderClass}
          cellAnswerCounts={cellAnswerCounts}
        />
      </div>
    </div>
  );
}
