import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { fetchTodaysPuzzle, submitGuess } from '../api/client';
import type { PuzzleResponse, GridItem } from '../types/puzzle';
import { isValidGameId } from '../config/games';
import PuzzleGrid from '../components/PuzzleGrid';
import GuessInput from '../components/GuessInput';

export default function PuzzlePage() {
  const { game } = useParams();
  const [puzzle, setPuzzle] = useState<PuzzleResponse | null>(null);
  const [filledCells, setFilledCells] = useState<Record<string, GridItem>>({});
  const [error, setError] = useState<string | null>(null);
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);

  const validGame = isValidGameId(game) ? game : undefined;

  useEffect(() => {
    if (!validGame) return;
    setPuzzle(null);
    setFilledCells({});
    setError(null);

    fetchTodaysPuzzle(validGame)
      .then(setPuzzle)
      .catch((err) => setError(err.message));
  }, [validGame]);

  if (!validGame) {
    return <Navigate to="/" replace />;
  }

  function handleCellClick(row: number, col: number) {
    setActiveCell({ row, col });
  }

  async function handleGuessSelect(item: GridItem) {
    if (!puzzle || !activeCell) return;

    const result = await submitGuess(puzzle.id, {
      row: activeCell.row,
      col: activeCell.col,
      itemId: item.id,
    });

    if (result.correct) {
      const cellKey = `${activeCell.row}-${activeCell.col}`;
      setFilledCells((prev) => ({
        ...prev,
        [cellKey]: {
          id: result.itemId,
          gameId: puzzle.gameId,
          displayName: result.displayName,
          imageUrl: result.imageUrl ?? '',
          attributes: {},
        },
      }));
    } else {
      alert(`${item.displayName} is not correct for that cell — try again.`);
    }

    setActiveCell(null);
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
          onClose={() => setActiveCell(null)}
        />
      )}
    </main>
  );
}