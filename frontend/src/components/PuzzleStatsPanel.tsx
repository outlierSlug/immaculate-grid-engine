import { useState } from 'react';
import PuzzleStatsBoard from './PuzzleStatsBoard';
import CommunityAnswersModal from './CommunityAnswersModal';
import ScoreDistributionModal from './ScoreDistributionModal';
import UniquenessModal from './UniquenessModal';
import { BOARD_WIDTH_CSS } from '../utils/gridSizing';
import { computeUniquenessPercentile } from '../utils/uniqueness';
import type { PuzzleStatsResponse } from '../types/puzzle';

interface PuzzleStatsPanelProps {
  puzzleStats: PuzzleStatsResponse;
  rowLabels: string[];
  colLabels: string[];
  // Live uniqueness score, computed the same way (and from the same source)
  // as the side-column UNIQ stat — passed down rather than recomputed here
  // so there's one place that owns filledCells + the formula inputs.
  yourUniquenessScore: number;
  avatarShapeClass: string;
}

export default function PuzzleStatsPanel({
  puzzleStats,
  rowLabels,
  colLabels,
  yourUniquenessScore,
  avatarShapeClass,
}: PuzzleStatsPanelProps) {
  const [tab, setTab] = useState<'most' | 'least'>('most');
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null);
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [uniquenessModalOpen, setUniquenessModalOpen] = useState(false);

  const { gamesPlayed, avgScore, mostUniqueScore, scoreDistribution, perCell, uniquenessScores, you } = puzzleStats;
  const selectedCell = selectedCellKey
    ? {
        cellKey: selectedCellKey,
        rowLabel: rowLabels[Number(selectedCellKey.split('-')[0])],
        colLabel: colLabels[Number(selectedCellKey.split('-')[1])],
      }
    : null;

  return (
    <div className="flex flex-col items-center gap-4 py-6 border-t border-gray-200 dark:border-gray-800 w-full">
      <h2 className="text-2xl font-bold">Puzzle Stats</h2>

      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-sm px-4 py-3 grid grid-cols-3"
        style={{ width: BOARD_WIDTH_CSS }}
      >
        {/* grid-cols-3 (not flex+justify-around) so all three stats sit in
            equal-width columns and stay centered regardless of the other
            two being buttons with their own padding — justify-around
            visibly skewed "Score Avg"/"Most Unique" left of "Games" once
            they got hover padding and Games didn't. */}
        <div className="flex flex-col items-center justify-center gap-0.5">
          <span className="text-sm text-black dark:text-gray-300">Games</span>
          <span className="text-lg font-bold tabular-nums">{gamesPlayed}</span>
        </div>
        <button
          type="button"
          onClick={() => setScoreModalOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 cursor-pointer rounded-lg py-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          <span className="text-sm text-black dark:text-gray-300">Score Avg</span>
          <span className="text-lg font-bold tabular-nums">{avgScore.toFixed(1)}</span>
        </button>
        <button
          type="button"
          onClick={() => setUniquenessModalOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 cursor-pointer rounded-lg py-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          <span className="text-sm text-black dark:text-gray-300">Most Unique</span>
          <span className="text-lg font-bold tabular-nums">{mostUniqueScore ?? '—'}</span>
        </button>
      </div>

      <div className="inline-flex rounded-full bg-gray-100 dark:bg-gray-800 p-1 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setTab('most')}
          className={`px-4 py-1.5 rounded-full cursor-pointer transition ${
            tab === 'most' ? 'bg-white dark:bg-gray-700 text-black dark:text-gray-100 shadow-sm' : 'text-black dark:text-gray-300'
          }`}
        >
          Most Common
        </button>
        <button
          type="button"
          onClick={() => setTab('least')}
          className={`px-4 py-1.5 rounded-full cursor-pointer transition ${
            tab === 'least' ? 'bg-white dark:bg-gray-700 text-black dark:text-gray-100 shadow-sm' : 'text-black dark:text-gray-300'
          }`}
        >
          Least Common
        </button>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2">Click square for details</p>

      <PuzzleStatsBoard
        rowCount={rowLabels.length}
        colCount={colLabels.length}
        perCell={perCell}
        mode={tab}
        onCellClick={setSelectedCellKey}
        avatarShapeClass={avatarShapeClass}
      />

      {selectedCell && perCell[selectedCell.cellKey] && (
        <CommunityAnswersModal
          rowLabel={selectedCell.rowLabel}
          colLabel={selectedCell.colLabel}
          cellStats={perCell[selectedCell.cellKey]}
          yourItemId={you?.cellAnswers[selectedCell.cellKey] ?? null}
          onClose={() => setSelectedCellKey(null)}
          avatarShapeClass={avatarShapeClass}
        />
      )}

      {scoreModalOpen && (
        <ScoreDistributionModal
          scoreDistribution={scoreDistribution}
          yourScore={you?.score}
          onClose={() => setScoreModalOpen(false)}
        />
      )}

      {uniquenessModalOpen && (
        <UniquenessModal
          uniquenessScores={uniquenessScores}
          yourScore={yourUniquenessScore}
          mostUniqueScore={mostUniqueScore}
          // This panel only ever renders once a puzzle attempt is already
          // recorded (post-completion or a cross-device remote-completion
          // view - see PuzzlePage), so `you` is always counted among
          // uniquenessScores by this point.
          percentile={computeUniquenessPercentile(yourUniquenessScore, uniquenessScores, true)}
          onClose={() => setUniquenessModalOpen(false)}
        />
      )}
    </div>
  );
}
