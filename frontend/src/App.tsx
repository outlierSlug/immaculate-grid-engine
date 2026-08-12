import { useEffect, useState } from 'react';
import { fetchTodaysPuzzle, submitGuess } from './api/client';
import type { PuzzleResponse, GridItem } from './types/puzzle';
import PuzzleGrid from './components/PuzzleGrid';
import GuessInput from './components/GuessInput';

const AVAILABLE_GAMES = [
  { id: 'genshin', label: 'Genshin Impact' },
  { id: 'brawlstars', label: 'Brawl Stars' },
];

function App() {
  const [game, setGame] = useState('genshin');
  const [puzzle, setPuzzle] = useState<PuzzleResponse | null>(null);
  const [filledCells, setFilledCells] = useState<Record<string, GridItem>>({});
  const [error, setError] = useState<string | null>(null);
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);

  useEffect(() => {
    setPuzzle(null);
    setFilledCells({});
    setError(null);

    fetchTodaysPuzzle(game)
      .then(setPuzzle)
      .catch((err) => setError(err.message));
  }, [game]);

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

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-12">
      <h1 className="text-2xl font-bold mb-4">Today's Grid</h1>

      <div className="flex gap-2 mb-8">
        {AVAILABLE_GAMES.map((g) => (
          <button
            key={g.id}
            onClick={() => setGame(g.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border ${
              game === g.id
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {error && <div className="text-red-600">Failed to load puzzle: {error}</div>}
      {!error && !puzzle && <div>Loading today's puzzle...</div>}

      {puzzle && (
        <>
          <PuzzleGrid
            rowLabels={puzzle.rowLabels}
            colLabels={puzzle.colLabels}
            filledCells={filledCells}
            onCellClick={handleCellClick}
          />
          {activeCell && (
            <GuessInput
              game={game}
              onSelect={handleGuessSelect}
              onClose={() => setActiveCell(null)}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;