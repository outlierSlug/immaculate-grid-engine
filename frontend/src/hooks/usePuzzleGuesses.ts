import { useEffect, useState } from 'react';
import { submitGuess } from '../api/client';
import type { PuzzleResponse, GridItem } from '../types/puzzle';

export interface UsePuzzleGuessesOptions {
  // Total guesses allowed across the whole puzzle — every submission counts,
  // right or wrong, matching the genre's shared-pool convention (not a
  // per-cell lock). null/undefined means unlimited.
  guessLimit?: number | null;
}

/**
 * Owns the grid-filling/guess-submission state shared by Daily and Unlimited
 * mode. Grid state resets whenever the puzzle identity changes (a new daily
 * puzzle loads, or Unlimited mode generates a fresh one).
 */
export function usePuzzleGuesses(puzzle: PuzzleResponse | null, options: UsePuzzleGuessesOptions = {}) {
  const { guessLimit = null } = options;
  const [filledCells, setFilledCells] = useState<Record<string, GridItem>>({});
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const [guessesUsed, setGuessesUsed] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    setFilledCells({});
    setActiveCell(null);
    setGuessesUsed(0);
    setGaveUp(false);
  }, [puzzle?.id]);

  const totalCells = puzzle ? puzzle.rowLabels.length * puzzle.colLabels.length : 0;
  const correctCount = Object.keys(filledCells).length;
  const isComplete = totalCells > 0 && correctCount === totalCells;
  const guessesRemaining = guessLimit != null ? Math.max(guessLimit - guessesUsed, 0) : null;
  const outOfGuesses = guessLimit != null && guessesRemaining === 0 && !isComplete;
  const isGameOver = isComplete || outOfGuesses || gaveUp;

  function handleCellClick(row: number, col: number) {
    if (isGameOver) return;
    setActiveCell({ row, col });
  }

  function closeActiveCell() {
    setActiveCell(null);
  }

  function giveUp() {
    setGaveUp(true);
    setActiveCell(null);
  }

  async function handleGuessSelect(item: GridItem) {
    if (!puzzle || !activeCell || isGameOver) return;

    const result = await submitGuess(puzzle.id, {
      row: activeCell.row,
      col: activeCell.col,
      itemId: item.id,
    });
    setGuessesUsed((prev) => prev + 1);

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

  return {
    filledCells,
    activeCell,
    handleCellClick,
    handleGuessSelect,
    closeActiveCell,
    correctCount,
    totalCells,
    isComplete,
    guessesRemaining,
    isGameOver,
    gaveUp,
    giveUp,
  };
}
