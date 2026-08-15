import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { fetchTodaysPuzzle } from '../api/client';
import type { PuzzleResponse } from '../types/puzzle';
import { isValidGameId, type GameId } from '../config/games';
import PuzzleGrid from '../components/PuzzleGrid';
import GuessInput from '../components/GuessInput';
import Timer from '../components/Timer';
import Score from '../components/Score';
import GuessCounter from '../components/GuessCounter';
import { usePuzzleGuesses } from '../hooks/usePuzzleGuesses';
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
    startedAt,
    endedAt,
  } = usePuzzleGuesses(puzzle, {
    guessLimit: DAILY_GUESS_LIMIT,
    persistKey: puzzle ? `daily-progress:${puzzle.id}` : null,
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
        sideColumn={[
          <Timer key="timer" startedAt={startedAt} endedAt={endedAt} visible />,
          <Score key="score" correct={correctCount} total={totalCells} feedback={feedback} />,
          <GuessCounter key="guesses" remaining={guessesRemaining} iconSrc={DAILY_GUESS_ICON[validGame]} feedback={feedback} />,
        ]}
      />

      {!isGameOver && (
        <button
          type="button"
          onClick={giveUp}
          className="px-5 py-2.5 rounded-full border border-gray-300 text-gray-600 font-semibold hover:bg-gray-100 transition cursor-pointer"
        >
          Give Up
        </button>
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
    </main>
  );
}
