import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { fetchTodaysPuzzle } from '../api/client';
import type { PuzzleResponse } from '../types/puzzle';
import { isValidGameId, type GameId } from '../config/games';
import PuzzleGrid from '../components/PuzzleGrid';
import GuessInput from '../components/GuessInput';
import Score from '../components/Score';
import GuessCounter from '../components/GuessCounter';
import UniquenessScore from '../components/UniquenessScore';
import PuzzleStatsPanel from '../components/PuzzleStatsPanel';
import ConfirmModal from '../components/ConfirmModal';
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
    return <div className="p-8 text-red-600">Failed to load puzzle: {error}</div>;
  }

  if (!puzzle) {
    return <div className="p-8">Loading today's puzzle...</div>;
  }

  const liveUniquenessScore = computeLiveUniquenessScore(filledCells, puzzleStats?.perCell);
  const uniquenessPercentile = puzzleStats
    ? computeUniquenessPercentile(liveUniquenessScore, puzzleStats.uniquenessScores)
    : null;

  return (
    <main className="flex flex-col items-center gap-5 py-8">
      <h1 className="text-2xl font-bold">Today's Puzzle</h1>

      <PuzzleGrid
        rowLabels={puzzle.rowLabels}
        colLabels={puzzle.colLabels}
        filledCells={filledCells}
        onCellClick={handleCellClick}
        locked={isGameOver}
        feedback={feedback}
        cellStats={puzzleStats?.perCell}
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
          className="px-5 py-2.5 rounded-full border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
        >
          Give Up
        </button>
      )}

      {confirmGiveUpOpen && (
        <ConfirmModal
          title="Give up?"
          message="Your current picks will be locked in and today's puzzle marked as done. This can't be undone."
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
        />
      )}

      {isGameOver && puzzleStats && (
        <PuzzleStatsPanel
          puzzleStats={puzzleStats}
          rowLabels={puzzle.rowLabels}
          colLabels={puzzle.colLabels}
          yourUniquenessScore={liveUniquenessScore}
        />
      )}
    </main>
  );
}
