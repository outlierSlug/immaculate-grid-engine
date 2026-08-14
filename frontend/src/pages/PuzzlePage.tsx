import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { fetchTodaysPuzzle } from '../api/client';
import type { PuzzleResponse } from '../types/puzzle';
import { isValidGameId } from '../config/games';
import PuzzleGrid from '../components/PuzzleGrid';
import GuessInput from '../components/GuessInput';
import { usePuzzleGuesses } from '../hooks/usePuzzleGuesses';

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

  const { filledCells, activeCell, handleCellClick, handleGuessSelect, closeActiveCell } = usePuzzleGuesses(puzzle);

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
    <main className="flex flex-col items-center py-12">
      <PuzzleGrid
        rowLabels={puzzle.rowLabels}
        colLabels={puzzle.colLabels}
        filledCells={filledCells}
        onCellClick={handleCellClick}
      />
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
