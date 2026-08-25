import { Fragment, type ReactNode } from 'react';
import CategoryChip from './CategoryChip';
import { HEADER_ROW_SIZE } from '../utils/gridSizing';
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
  // Per-game shape mask for the filled-cell portrait - see the
  // avatarShapeClass comment in config/games.ts for why this varies
  // per game instead of being a fixed rounded-full.
  avatarShapeClass: string;
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
  avatarShapeClass,
}: PuzzleGridProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        // Below sm, the trailing stats column collapses to 0 width and the
        // cell/label columns switch to the -solo sizing (bigger vw share,
        // since there are only 4 columns splitting the width instead of 5) -
        // see the --grid-*-solo comment in index.css. The side stats content
        // itself moves to a separate row below the grid (rendered further
        // down) instead of disappearing.
        //
        // -ml-(--col-label): centering this block naively (flex items-center
        // on the parent) centers the whole label+cells span, but with no
        // trailing column to balance the label, that puts the CELLS - the
        // visually dominant part - off-center to the right by half the
        // label's width. The fix isn't a -half-label margin, though: for a
        // flex item centered via align-items, the margin box (content +
        // margin) is what gets centered, so a negative margin only moves
        // the content by HALF its own value - the other half is absorbed
        // into where the centering math lands. A full -1x-label-width
        // margin therefore produces the needed half-label-width shift.
        // (0 on sm+, where the trailing column already balances things.)
        className="grid -ml-(--col-label) sm:ml-0 [--col-cell:var(--grid-cell-solo)] [--col-label:var(--grid-label-solo)] [--col-stats:0px] sm:[--col-cell:var(--grid-cell)] sm:[--col-label:var(--grid-label)] sm:[--col-stats:var(--grid-label)]"
        style={{
          // clamp() so this scales down on narrow viewports instead of
          // overflowing at a fixed 7rem/8rem (38rem = 608px total, wider than
          // any phone) — caps out at the original fixed values on desktop, so
          // nothing changes above ~610px wide.
          gridTemplateColumns: `var(--col-label) repeat(${colLabels.length}, var(--col-cell)) var(--col-stats)`,
          gridTemplateRows: `${HEADER_ROW_SIZE} repeat(${rowLabels.length}, var(--col-cell))`,
        }}
      >
      <div />

      {colLabels.map((label) => (
        // Extra bottom padding (not just p-2 on every side) - the chip was
        // reading as touching the grid below it, since a flex-centered
        // chip just grows to fill however wide/tall its own grid track is
        // rather than leaving visible room on its own. Biasing padding
        // toward the grid-facing side is what actually creates a visible
        // gap there, at the cost of the chip no longer sitting perfectly
        // centered in its own track - an acceptable trade since the eye
        // reads this as "gap before the grid," not "chip is off-center."
        <div key={label} className="flex items-center justify-center p-2 pb-3">
          <CategoryChip label={label} />
        </div>
      ))}

      <div />

      {rowLabels.map((rowLabel, rowIndex) => (
        <Fragment key={rowLabel}>
          {/* Same reasoning as the column label above, mirrored to the
              right side since row labels sit to the grid's left. */}
          <div className="flex items-center justify-center p-2 pr-3">
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
              : 'border-gray-300 dark:border-gray-700';

            return (
              <button
                key={cellKey}
                onClick={() => onCellClick(rowIndex, colIndex)}
                disabled={!!filled || locked}
                className={`relative border ${borderColorClass} focus-ring-inset transition-colors duration-200 bg-white dark:bg-gray-900 flex flex-col items-center justify-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:hover:bg-white dark:disabled:hover:bg-gray-900 cursor-pointer disabled:cursor-not-allowed`}
              >
                {filled ? (
                  <>
                    {rarityPercent != null && (
                      <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-semibold text-xs leading-tight">
                        {rarityPercent > 0 && rarityPercent < 1 ? '<1' : Math.round(rarityPercent)}%
                      </span>
                    )}
                    <img
                      src={filled.imageUrl}
                      alt={filled.displayName}
                      className={`w-(--grid-avatar) h-(--grid-avatar) ${avatarShapeClass} object-cover border border-gray-200 dark:border-gray-700 shadow-sm`}
                    />
                    <span className="inline-flex items-center justify-center text-center px-1.5 sm:px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-semibold text-(length:--grid-avatar-label) leading-tight max-w-[92%] wrap-break-word">
                      {filled.displayName}
                    </span>
                  </>
                ) : null}
              </button>
            );
          })}

          {/* invisible (not hidden/display:none) below sm - a display:none
              grid item is removed from auto-placement entirely, which
              shifted every following item's column by one and cascaded
              through the rows. invisible keeps its (already 0px-wide)
              grid cell in place without being visible; the same items
              render again, actually visible, in the mobile-only row below
              the grid instead. */}
          <div className="flex invisible sm:visible items-center justify-center">{sideColumn?.[rowIndex] ?? null}</div>
        </Fragment>
      ))}
    </div>

    {sideColumn && (
      // Same column template as the main grid above (minus its own trailing
      // stats column, which doesn't apply here) so each stat lands centered
      // directly under its matching cell column instead of just floating as
      // a loose centered row.
      <div
        className="grid sm:hidden -ml-(--col-label) [--col-cell:var(--grid-cell-solo)] [--col-label:var(--grid-label-solo)]"
        style={{ gridTemplateColumns: `var(--col-label) repeat(${colLabels.length}, var(--col-cell))` }}
      >
        <div />
        {sideColumn.map((item, i) => (
          <div key={i} className="flex items-center justify-center">
            {item}
          </div>
        ))}
      </div>
    )}
    </div>
  );
}
