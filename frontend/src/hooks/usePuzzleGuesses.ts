import { useEffect, useState } from 'react';
import { submitGuess } from '../api/client';
import type { PuzzleResponse, GridItem } from '../types/puzzle';

/**
 * Owns the grid-filling/guess-submission state shared by Daily and Unlimited
 * mode. Grid state resets whenever the puzzle identity changes (a new daily
 * puzzle loads, or Unlimited mode generates a fresh one).
 */
export function usePuzzleGuesses(puzzle: PuzzleResponse | null) {
  const [filledCells, setFilledCells] = useState<Record<string, GridItem>>({});
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);

  useEffect(() => {
    setFilledCells({});
    setActiveCell(null);
  }, [puzzle?.id]);

  function handleCellClick(row: number, col: number) {
    setActiveCell({ row, col });
  }

  function closeActiveCell() {
    setActiveCell(null);
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

  const totalCells = puzzle ? puzzle.rowLabels.length * puzzle.colLabels.length : 0;
  const correctCount = Object.keys(filledCells).length;
  const isComplete = totalCells > 0 && correctCount === totalCells;

  return {
    filledCells,
    activeCell,
    handleCellClick,
    handleGuessSelect,
    closeActiveCell,
    correctCount,
    totalCells,
    isComplete,
  };
}
