import { useEffect, useState } from 'react';
import { fetchTodaysPuzzle, submitGuess } from './api/client';
import type { PuzzleResponse, GridItem } from './types/puzzle';
import PuzzleGrid from './components/PuzzleGrid';
import GuessInput from './components/GuessInput';

function App() {
  const [puzzle, setPuzzle] = useState<PuzzleResponse | null>(null);
  const [filledCells, setFilledCells] = useState<Record<string, GridItem>>({});
  const [error, setError] = useState<string | null>(null);
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);

  useEffect(() => {
    fetchTodaysPuzzle()
      .then(setPuzzle)
      .catch((err) => setError(err.message));
  }, []);

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
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-12">
      <h1 className="text-2xl font-bold mb-8">Today's Genshin Grid</h1>
      <PuzzleGrid
        rowLabels={puzzle.rowLabels}
        colLabels={puzzle.colLabels}
        filledCells={filledCells}
        onCellClick={handleCellClick}
      />
      {activeCell && (
        <GuessInput
          onSelect={handleGuessSelect}
          onClose={() => setActiveCell(null)}
        />
      )}
    </div>
  );
}

export default App;