import { useEffect, useState } from 'react';
import { fetchPuzzleStats, submitGuess, submitPuzzleAttempt } from '../api/client';
import { getSessionId } from '../utils/session';
import type { PuzzleResponse, GridItem, PuzzleStatsResponse } from '../types/puzzle';

export interface UsePuzzleGuessesOptions {
  // Total guesses allowed across the whole puzzle — every submission counts,
  // right or wrong, matching the genre's shared-pool convention (not a
  // per-cell lock). null/undefined means unlimited.
  guessLimit?: number | null;
  // When set, progress (filledCells/guessesUsed/gaveUp/startedAt/endedAt) is
  // saved to localStorage under this exact key and restored on mount/puzzle
  // change instead of starting empty. Caller is responsible for making the
  // key unique per puzzle identity (e.g. including puzzle.id, which itself
  // encodes the date for Daily) — the hook never inspects the puzzle to
  // build this itself, so it stays usable for any mode. null/undefined
  // means no persistence (in-memory only, today's Unlimited behavior).
  persistKey?: string | null;
  // Daily-only: submits a PuzzleAttempt at game-over and fetches live
  // community stats (rarity %, uniqueness score, etc.) on load and after
  // every correct guess. Nothing about rarity is ever persisted to
  // localStorage — it's always re-fetched, by design (see
  // docs/ARCHITECTURE.md's Phase 6 notes): the same cell can show a
  // different percentage on a later visit as more people play.
  trackStats?: boolean;
}

interface StoredProgress {
  filledCells: Record<string, GridItem>;
  guessesUsed: number;
  gaveUp: boolean;
  startedAt: number;
  endedAt: number | null;
}

function loadProgress(key: string): StoredProgress | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    return {
      filledCells: parsed.filledCells ?? {},
      guessesUsed: typeof parsed.guessesUsed === 'number' ? parsed.guessesUsed : 0,
      gaveUp: !!parsed.gaveUp,
      startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : Date.now(),
      endedAt: typeof parsed.endedAt === 'number' ? parsed.endedAt : null,
    };
  } catch {
    // Corrupt/foreign data under this key shouldn't crash the page — just
    // treat it as if there were no saved progress.
    return null;
  }
}

function saveProgress(key: string, progress: StoredProgress) {
  try {
    localStorage.setItem(key, JSON.stringify(progress));
  } catch {
    // Storage full/unavailable (e.g. private browsing) — progress just
    // won't survive a refresh; not worth surfacing to the player.
  }
}

/**
 * Owns the grid-filling/guess-submission state shared by Daily and Unlimited
 * mode. Grid state resets whenever the puzzle identity changes (a new daily
 * puzzle loads, or Unlimited mode generates a fresh one) — or, if persistKey
 * is set, restores from localStorage instead of resetting.
 */
export function usePuzzleGuesses(puzzle: PuzzleResponse | null, options: UsePuzzleGuessesOptions = {}) {
  const { guessLimit = null, persistKey = null, trackStats = false } = options;
  const [filledCells, setFilledCells] = useState<Record<string, GridItem>>({});
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const [guessesUsed, setGuessesUsed] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);
  // Most recent guess result, consumed by PuzzleGrid for a brief non-blocking
  // border flash instead of alert(). Cleared automatically after a beat.
  const [feedback, setFeedback] = useState<{ row: number; col: number; correct: boolean } | null>(null);
  // Wall-clock timestamps (epoch ms), not accumulated durations — surviving
  // a refresh and freezing correctly at game-over both fall out naturally
  // from deriving elapsed time as (endedAt ?? now) - startedAt rather than
  // ticking a counter that resets on every remount.
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [endedAt, setEndedAt] = useState<number | null>(null);
  // Community stats snapshot as of the last fetch — never persisted, always
  // re-requested (see trackStats doc comment above).
  const [puzzleStats, setPuzzleStats] = useState<PuzzleStatsResponse | null>(null);

  async function refreshStats(puzzleId: string) {
    const stats = await fetchPuzzleStats(puzzleId, getSessionId());
    setPuzzleStats(stats);
  }

  useEffect(() => {
    const stored = persistKey ? loadProgress(persistKey) : null;
    const now = Date.now();
    const nextStartedAt = stored?.startedAt ?? now;
    const nextEndedAt = stored?.endedAt ?? null;

    setFilledCells(stored?.filledCells ?? {});
    setGuessesUsed(stored?.guessesUsed ?? 0);
    setGaveUp(stored?.gaveUp ?? false);
    setActiveCell(null);
    setFeedback(null);
    setStartedAt(nextStartedAt);
    setEndedAt(nextEndedAt);

    // First-ever visit to this puzzle: persist the freshly-chosen startedAt
    // right away, so a refresh moments later (before any guess) resumes
    // from the same start instant instead of restarting the clock.
    if (persistKey && !stored) {
      saveProgress(persistKey, {
        filledCells: {},
        guessesUsed: 0,
        gaveUp: false,
        startedAt: nextStartedAt,
        endedAt: nextEndedAt,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle?.id, persistKey]);

  // Refreshes rarity badges for whatever's already filled (restored from
  // localStorage, or just an empty board on a fresh puzzle) as soon as the
  // puzzle is known — independent of the hydration effect above, since
  // stats don't depend on this session's own progress.
  useEffect(() => {
    if (!trackStats || !puzzle) {
      setPuzzleStats(null);
      return;
    }
    refreshStats(puzzle.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle?.id, trackStats]);

  const totalCells = puzzle ? puzzle.rowLabels.length * puzzle.colLabels.length : 0;
  const correctCount = Object.keys(filledCells).length;
  const isComplete = totalCells > 0 && correctCount === totalCells;
  const guessesRemaining = guessLimit != null ? Math.max(guessLimit - guessesUsed, 0) : null;
  const outOfGuesses = guessLimit != null && guessesRemaining === 0 && !isComplete;
  const isGameOver = isComplete || outOfGuesses || gaveUp;

  // Captures the exact instant the game ends (once), independent of which
  // action caused it (solved, out of guesses, or gave up), and persists it —
  // this is what lets the timer freeze at the true final time rather than
  // recomputing "now - startedAt" forever on every future page load.
  useEffect(() => {
    if (!isGameOver || endedAt != null) return;
    const ts = Date.now();
    setEndedAt(ts);
    if (persistKey) {
      saveProgress(persistKey, {
        filledCells,
        guessesUsed,
        gaveUp,
        startedAt: startedAt ?? ts,
        endedAt: ts,
      });
    }
    if (trackStats && puzzle) {
      const cellAnswers = Object.fromEntries(
        Object.entries(filledCells).map(([cellKey, item]) => [cellKey, item.id])
      );
      submitPuzzleAttempt(puzzle.id, {
        sessionId: getSessionId(),
        cellAnswers,
        score: correctCount,
        guessesUsed,
        solved: isComplete,
        gaveUp,
        elapsedMs: ts - (startedAt ?? ts),
      }).then(() => refreshStats(puzzle.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGameOver]);

  // Clears the transient flash a moment after it's shown.
  useEffect(() => {
    if (!feedback) return;
    const timeout = setTimeout(() => setFeedback(null), 400);
    return () => clearTimeout(timeout);
  }, [feedback]);

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
    if (persistKey) {
      saveProgress(persistKey, {
        filledCells,
        guessesUsed,
        gaveUp: true,
        startedAt: startedAt ?? Date.now(),
        endedAt,
      });
    }
  }

  async function handleGuessSelect(item: GridItem) {
    if (!puzzle || !activeCell || isGameOver) return;
    const { row, col } = activeCell;

    const result = await submitGuess(puzzle.id, { row, col, itemId: item.id });

    const nextGuessesUsed = guessesUsed + 1;
    setGuessesUsed(nextGuessesUsed);

    let nextFilledCells = filledCells;
    if (result.correct) {
      const cellKey = `${row}-${col}`;
      nextFilledCells = {
        ...filledCells,
        [cellKey]: {
          id: result.itemId,
          gameId: puzzle.gameId,
          displayName: result.displayName,
          imageUrl: result.imageUrl ?? '',
          attributes: {},
        },
      };
      setFilledCells(nextFilledCells);
    }
    setFeedback({ row, col, correct: result.correct });

    if (persistKey) {
      saveProgress(persistKey, {
        filledCells: nextFilledCells,
        guessesUsed: nextGuessesUsed,
        gaveUp,
        startedAt: startedAt ?? Date.now(),
        endedAt,
      });
    }

    if (trackStats && result.correct) {
      refreshStats(puzzle.id);
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
    feedback,
    startedAt,
    endedAt,
    puzzleStats,
  };
}
