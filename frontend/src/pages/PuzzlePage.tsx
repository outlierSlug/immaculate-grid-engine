import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { fetchTodaysPuzzle } from '../api/client';
import type { PuzzleResponse } from '../types/puzzle';
import { GAMES, isValidGameId, type GameId } from '../config/games';
import PuzzleGrid from '../components/PuzzleGrid';
import GuessInput from '../components/GuessInput';
import Score from '../components/Score';
import GuessCounter from '../components/GuessCounter';
import UniquenessScore from '../components/UniquenessScore';
import PuzzleStatsPanel from '../components/PuzzleStatsPanel';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSpinner from '../components/LoadingSpinner';
import { usePuzzleGuesses } from '../hooks/usePuzzleGuesses';
import { computeLiveUniquenessScore, computeUniquenessPercentile } from '../utils/uniqueness';
import intertwinedFateIcon from '../assets/genshin/Item_Intertwined_Fate.webp';

// Daily's guess limit is a fixed genre convention (matches Pokedoku), not a
// user-facing setting — unlike Unlimited, there is no toggle and no
// settings surface for it.
const DAILY_GUESS_LIMIT = 9;

const DAILY_GUESS_ICON: Partial<Record<GameId, string>> = {
  genshin: intertwinedFateIcon,
};

export default function PuzzlePage() {
  const { game } = useParams();
  const [puzzle, setPuzzle] = useState<PuzzleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmGiveUpOpen, setConfirmGiveUpOpen] = useState(false);

  const validGame = isValidGameId(game) ? game : undefined;

  useEffect(() => {
    if (!validGame) return;
    setPuzzle(null);
    setError(null);

    fetchTodaysPuzzle(validGame)
      .then(setPuzzle)
      .catch((err) => setError(err.message));
  }, [validGame]);

  // Daily's puzzle id encodes the date ("{gameId}:{date}"), so a puzzle
  // loaded before midnight silently goes stale if the tab is just left
  // open - refresh was the only way to notice. This re-asks the server
  // whenever the tab regains attention and swaps in a new puzzle only if
  // the id actually changed, rather than polling on a timer: no client-side
  // guess at what timezone "today" resets in, no background work while the
  // tab isn't being looked at, and a same-day recheck is a no-op that
  // leaves in-progress state (filled cells, guesses used) untouched, since
  // usePuzzleGuesses only resets on puzzle.id actually changing.
  useEffect(() => {
    if (!validGame) return;

    function checkForNewPuzzle() {
      if (document.visibilityState !== 'visible') return;
      fetchTodaysPuzzle(validGame!)
        .then((latest) => {
          setPuzzle((current) => (current && current.id === latest.id ? current : latest));
        })
        .catch(() => {
          // Silent - this is a background freshness check, not the primary
          // load path. A transient failure here shouldn't disrupt an
          // already-loaded puzzle; the next focus/visibility event retries.
        });
    }

    document.addEventListener('visibilitychange', checkForNewPuzzle);
    window.addEventListener('focus', checkForNewPuzzle);
    return () => {
      document.removeEventListener('visibilitychange', checkForNewPuzzle);
      window.removeEventListener('focus', checkForNewPuzzle);
    };
  }, [validGame]);

  const {
    filledCells,
    activeCell,
    handleCellClick,
    handleGuessSelect,
    closeActiveCell,
    correctCount,
    totalCells,
    guessesRemaining,
    isGameOver,
    giveUp,
    feedback,
    puzzleStats,
  } = usePuzzleGuesses(puzzle, {
    guessLimit: DAILY_GUESS_LIMIT,
    persistKey: puzzle ? `daily-progress:${puzzle.id}` : null,
    trackStats: true,
  });

  if (!validGame) {
    return <Navigate to="/" replace />;
  }

  if (error) {
    return (
      <main className="flex items-center justify-center min-h-[60vh] p-8">
        <p className="text-red-600 dark:text-red-400">Failed to load puzzle: {error}</p>
      </main>
    );
  }

  if (!puzzle) {
    return (
      <main className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner label="Loading today's puzzle..." size="lg" />
      </main>
    );
  }

  const liveUniquenessScore = computeLiveUniquenessScore(filledCells, puzzleStats?.perCell);
  const uniquenessPercentile = puzzleStats
    ? computeUniquenessPercentile(liveUniquenessScore, puzzleStats.uniquenessScores)
    : null;
  const avatarShapeClass = GAMES[validGame].avatarShapeClass;

  return (
    <main className="flex flex-col items-center gap-5 py-8 motion-safe:animate-[page-in_350ms_ease-out]">
      <h1 className="text-2xl font-bold">Today's Puzzle</h1>

      <PuzzleGrid
        rowLabels={puzzle.rowLabels}
        colLabels={puzzle.colLabels}
        filledCells={filledCells}
        onCellClick={handleCellClick}
        locked={isGameOver}
        feedback={feedback}
        cellStats={puzzleStats?.perCell}
        avatarShapeClass={avatarShapeClass}
        sideColumn={[
          <UniquenessScore key="uniq" score={liveUniquenessScore} percentile={uniquenessPercentile} />,
          <Score key="score" correct={correctCount} total={totalCells} feedback={feedback} />,
          <GuessCounter key="guesses" remaining={guessesRemaining} iconSrc={DAILY_GUESS_ICON[validGame]} feedback={feedback} />,
        ]}
      />

      {!isGameOver && (
        <button
          type="button"
          onClick={() => setConfirmGiveUpOpen(true)}
          className="px-5 py-2.5 rounded-full border border-red-300 dark:border-red-800/70 text-gray-600 dark:text-gray-400 font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-400 dark:hover:border-red-700 transition cursor-pointer"
        >
          Give Up
        </button>
      )}

      {confirmGiveUpOpen && (
        <ConfirmModal
          title="Give up?"
          message="Your current picks will be locked in and today's puzzle marked as done. This cannot be undone."
          confirmLabel="Give Up"
          onConfirm={() => {
            setConfirmGiveUpOpen(false);
            giveUp();
          }}
          onCancel={() => setConfirmGiveUpOpen(false)}
        />
      )}

      {activeCell && (
        <GuessInput
          game={validGame}
          rowLabel={puzzle.rowLabels[activeCell.row]}
          colLabel={puzzle.colLabels[activeCell.col]}
          usedItemIds={new Set(Object.values(filledCells).map((item) => item.id))}
          onSelect={handleGuessSelect}
          onClose={closeActiveCell}
          avatarShapeClass={avatarShapeClass}
        />
      )}

      {isGameOver && puzzleStats && (
        <PuzzleStatsPanel
          puzzleStats={puzzleStats}
          rowLabels={puzzle.rowLabels}
          colLabels={puzzle.colLabels}
          yourUniquenessScore={liveUniquenessScore}
          avatarShapeClass={avatarShapeClass}
        />
      )}
    </main>
  );
}
