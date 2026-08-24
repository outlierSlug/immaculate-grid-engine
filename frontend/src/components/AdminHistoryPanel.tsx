import { useEffect, useState } from 'react';
import { fetchAdminPuzzleHistory, AdminApiError } from '../api/client';
import { GAMES, type GameId } from '../config/games';
import AdminHistoryBoard from './AdminHistoryBoard';
import AdminGridStats, { STATS_WIDTH } from './AdminGridStats';
import CommunityAnswersModal from './CommunityAnswersModal';
import ScoreDistributionModal from './ScoreDistributionModal';
import UniquenessModal from './UniquenessModal';
import { BOARD_WIDTH_CSS, LABEL_COL_SIZE } from '../utils/gridSizing';
import { todayIso, addDays } from '../utils/dateIso';
import type { AdminPuzzleHistoryResponse } from '../types/puzzle';

interface AdminHistoryPanelProps {
  game: GameId;
}

// Read-only puzzle viewer: reuses the exact same board/modals a real player
// sees post-completion (PuzzleStatsBoard's cell rendering via
// AdminHistoryBoard, CommunityAnswersModal, ScoreDistributionModal,
// UniquenessModal) instead of building a parallel "admin preview" look for
// this tab - there's no curation decision being made here, just visibility
// into what already happened (or is happening today), so it should look
// like what it's showing. Deliberately not date-window-limited the way the
// public Archive is (see AdminPuzzleService.getHistory) - today or any date
// before it is fair game.
export default function AdminHistoryPanel({ game }: AdminHistoryPanelProps) {
  const [date, setDate] = useState(todayIso());
  const [history, setHistory] = useState<AdminPuzzleHistoryResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Which "game|date" combo the above three reflect, so "loading" is derived
  // by comparison instead of a separate boolean requiring a synchronous
  // setState at the top of the effect (react-hooks/set-state-in-effect).
  const [resultFor, setResultFor] = useState<string | null>(null);
  const requestKey = `${game}|${date}`;
  const loading = resultFor !== requestKey;

  const [tab, setTab] = useState<'most' | 'least'>('most');
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null);
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [uniquenessModalOpen, setUniquenessModalOpen] = useState(false);

  useEffect(() => {
    fetchAdminPuzzleHistory(game, date)
      .then((result) => {
        setHistory(result);
        setNotFound(false);
        setErrorMessage(null);
        setResultFor(requestKey);
      })
      .catch((err) => {
        setHistory(null);
        if (err instanceof AdminApiError && err.status === 404) {
          setNotFound(true);
          setErrorMessage(null);
        } else {
          setNotFound(false);
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load this puzzle.');
        }
        setResultFor(requestKey);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, date]);

  // A new date/game pick invalidates whatever cell/modal was open for the
  // previous puzzle - render-phase reset (not an effect) so there's no
  // frame where a stale modal briefly shows data for the wrong puzzle.
  const [resetFor, setResetFor] = useState(requestKey);
  if (resetFor !== requestKey) {
    setResetFor(requestKey);
    setSelectedCellKey(null);
    setScoreModalOpen(false);
    setUniquenessModalOpen(false);
  }

  const avatarShapeClass = GAMES[game].avatarShapeClass;

  const selectedCell = selectedCellKey && history
    ? {
        cellKey: selectedCellKey,
        rowLabel: history.rowCategories[Number(selectedCellKey.split('-')[0])].label,
        colLabel: history.colCategories[Number(selectedCellKey.split('-')[1])].label,
      }
    : null;

  // AdminGridStats wants a plain cellKey -> itemIds map, same shape the
  // Curate tab's AdminPuzzleResponse/AdminPuzzleCandidateResponse carry
  // directly - History's stats.perCell instead carries full CellAnswerStat
  // objects (getStatsForAdmin always reveals every valid answer, count 0
  // included, so `answers` already IS the complete solution set per cell),
  // so this is just a reshape, not a second fetch.
  const cellSolutions = history
    ? Object.fromEntries(
        Object.entries(history.stats.perCell).map(([cellKey, cell]) => [cellKey, cell.answers.map((a) => a.itemId)])
      )
    : undefined;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setDate(addDays(date, -1))}
          aria-label="Previous day"
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
        >
          ‹
        </button>
        <input
          type="date"
          value={date}
          max={todayIso()}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300"
        />
        <button
          type="button"
          onClick={() => setDate(addDays(date, 1))}
          disabled={date >= todayIso()}
          aria-label="Next day"
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-900 cursor-pointer"
        >
          ›
        </button>
      </div>

      {loading && <p className="text-sm text-gray-400 dark:text-gray-500">Loading…</p>}

      {!loading && notFound && (
        <p className="text-sm text-gray-400 dark:text-gray-500">No puzzle was ever generated for this date.</p>
      )}

      {!loading && errorMessage && (
        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      )}

      {!loading && history && (
        // key={requestKey} replays the fade on every date/game switch, same
        // "different content, same slot" treatment AdminPage gives a tab
        // switch - safe here since the render-phase reset above already
        // clears any open modal before this ever renders for a new key.
        <div key={requestKey} className="flex flex-col items-center gap-4 motion-safe:animate-[page-in_300ms_ease-out]">
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-sm px-4 py-3 grid grid-cols-3"
            style={{ width: BOARD_WIDTH_CSS }}
          >
            <div className="flex flex-col items-center justify-center gap-0.5">
              <span className="text-sm text-black dark:text-gray-300">Games</span>
              <span className="text-lg font-bold tabular-nums">{history.stats.gamesPlayed}</span>
            </div>
            <button
              type="button"
              onClick={() => setScoreModalOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 cursor-pointer rounded-lg py-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <span className="text-sm text-black dark:text-gray-300">Score Avg</span>
              <span className="text-lg font-bold tabular-nums">{history.stats.avgScore.toFixed(1)}</span>
            </button>
            <button
              type="button"
              onClick={() => setUniquenessModalOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 cursor-pointer rounded-lg py-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <span className="text-sm text-black dark:text-gray-300">Most Unique</span>
              <span className="text-lg font-bold tabular-nums">{history.stats.mostUniqueScore ?? '—'}</span>
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

          <div className="flex items-center justify-center gap-6">
            {/* AdminHistoryBoard's own right edge is flush with its actual
                cells (no trailing balance column) so the gap to AdminGridStats
                below stays a plain, consistent gap-6 - but that leaves a
                LEADING label column on the left with nothing balancing it.
                statsW - LABEL_COL_SIZE is exactly the width that keeps the
                CELLS (not the label+cells block) aligned under the
                label-free stat row above (BOARD_WIDTH_CSS = pure 3-cell
                width) - see AdminGridStats' STATS_WIDTH constant. */}
            <div style={{ width: `calc(${STATS_WIDTH} - ${LABEL_COL_SIZE})` }} className="shrink-0" aria-hidden="true" />
            <AdminHistoryBoard
              rowCategories={history.rowCategories}
              colCategories={history.colCategories}
              perCell={history.stats.perCell}
              mode={tab}
              onCellClick={setSelectedCellKey}
              avatarShapeClass={avatarShapeClass}
            />
            <AdminGridStats
              rowCategories={history.rowCategories}
              colCategories={history.colCategories}
              cellSolutions={cellSolutions}
            />
          </div>

          {selectedCell && history.stats.perCell[selectedCell.cellKey] && (
            <CommunityAnswersModal
              rowLabel={selectedCell.rowLabel}
              colLabel={selectedCell.colLabel}
              cellStats={history.stats.perCell[selectedCell.cellKey]}
              yourItemId={null}
              onClose={() => setSelectedCellKey(null)}
              avatarShapeClass={avatarShapeClass}
            />
          )}

          {scoreModalOpen && (
            <ScoreDistributionModal
              scoreDistribution={history.stats.scoreDistribution}
              yourScore={null}
              onClose={() => setScoreModalOpen(false)}
            />
          )}

          {uniquenessModalOpen && (
            <UniquenessModal
              uniquenessScores={history.stats.uniquenessScores}
              yourScore={null}
              mostUniqueScore={history.stats.mostUniqueScore}
              percentile={null}
              onClose={() => setUniquenessModalOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
