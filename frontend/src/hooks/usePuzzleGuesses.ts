import { useEffect, useRef, useState } from 'react';
import { fetchPuzzleStats, submitGuess, submitPuzzleAttempt } from '../api/client';
import { getSessionId } from '../utils/session';
import { celebrateSolve } from '../utils/confetti';
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
  // Tags the submitted PuzzleAttempt as live-day vs archive play (see
  // SubmitAttemptRequest's doc comment) — only meaningful when trackStats
  // is also true. Defaults true so every existing caller (just the
  // canonical /today route) keeps behaving exactly as before without
  // needing to pass it; PuzzlePage passes false explicitly for Archive.
  playedLive?: boolean;
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
  const { guessLimit = null, persistKey = null, trackStats = false, playedLive = true } = options;
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

  // Tracks the outgoing puzzle's identity across a puzzle.id change, so the
  // reset effect below can tell "a genuinely different puzzle just swapped
  // in" (e.g. the midnight rollover, still-live-tab case) apart from the
  // initial mount, and so it can still address the OLD persistKey after the
  // new one has already replaced it in scope.
  const previousIdentityRef = useRef<{ puzzleId: string; persistKey: string | null } | null>(null);
  // Guards handleGuessSelect against a second click firing while the first
  // submission is still in flight (double-click, mobile double-tap, or just
  // an impatient re-click on a slow connection - nothing else disables the
  // confirm button mid-request). Without this, both calls read the same
  // stale `guessesUsed` closure and both compute the same "next" value, so
  // the client only counts one increment while the server - which commits
  // each guess's spend unconditionally, by design, see PuzzleService.
  // checkGuess - correctly consumes two. That desync is permanent for the
  // rest of the puzzle (guessesUsed only ever moves forward from a
  // successful response), and was mistaken for a stale-puzzle/deploy-timing
  // issue in production before this was found.
  const submittingRef = useRef(false);

  useEffect(() => {
    const previous = previousIdentityRef.current;
    previousIdentityRef.current = puzzle ? { puzzleId: puzzle.id, persistKey } : null;

    // Auto-finalizes the OUTGOING puzzle as a gave-up attempt if the day
    // rolled over while this tab was still open on it, mid-play. Without
    // this, an in-progress game (some guesses used, never reaching its own
    // game-over) would just have its state silently reset and discarded the
    // moment the new day's puzzle swaps in - never submitted, not even as
    // incomplete. "The reset happened, so the player settles for what they
    // had" is treated the same as clicking Give Up themselves. Only fires
    // for genuine engagement (guessesUsed > 0) so a puzzle merely left open
    // untouched doesn't inflate games-played with a hollow 0-score entry;
    // only Daily (trackStats) can ever hit this at all, since Archive dates
    // are immutable and never swap out from under the page on their own.
    if (previous && previous.puzzleId !== puzzle?.id && trackStats && !isGameOver && guessesUsed > 0) {
      const ts = Date.now();
      const cellAnswers = Object.fromEntries(
        Object.entries(filledCells).map(([cellKey, item]) => [cellKey, item.id])
      );
      submitPuzzleAttempt(previous.puzzleId, {
        sessionId: getSessionId(),
        cellAnswers,
        score: correctCount,
        guessesUsed,
        solved: false,
        gaveUp: true,
        elapsedMs: ts - (startedAt ?? ts),
        playedLive,
      });
      if (previous.persistKey) {
        saveProgress(previous.persistKey, {
          filledCells,
          guessesUsed,
          gaveUp: true,
          startedAt: startedAt ?? ts,
          endedAt: ts,
        });
      }
    }

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

  // Keeps two tabs/windows on the same puzzle+identity from drifting apart.
  // Without this, each tab only reads localStorage once (on mount/puzzle
  // change) and then trusts its own in-memory guessesUsed/filledCells for
  // the rest of its life - so a wrong guess spent in tab A is invisible to
  // tab B until tab B happens to remount. That's more than a display nit:
  // the backend now independently enforces the same shared guess budget per
  // (puzzleId, sessionId) (see PuzzleService.checkGuess), so a stale tab B
  // wouldn't get a free extra guess even without this - but it would still
  // get a confusing rejected-guess error instead of just seeing tab A's
  // guess already reflected, which this resync avoids. The `storage`
  // event fires only in OTHER same-origin tabs when localStorage changes
  // (never the tab that made the write), which is exactly the asymmetry
  // needed here - this re-syncs the instant another tab writes under the
  // same key, closing the window before a human could switch tabs and act
  // on it. Closes any cell this tab had open, too, since it may now be
  // stale (already filled, or the game may have just ended) the moment the
  // sync lands.
  useEffect(() => {
    if (!persistKey) return;

    function handleStorage(e: StorageEvent) {
      if (e.key !== persistKey) return;
      const stored = loadProgress(persistKey!);
      setFilledCells(stored?.filledCells ?? {});
      setGuessesUsed(stored?.guessesUsed ?? 0);
      setGaveUp(stored?.gaveUp ?? false);
      setEndedAt(stored?.endedAt ?? null);
      setActiveCell(null);
      setFeedback(null);
      if (trackStats && puzzle) {
        refreshStats(puzzle.id);
      }
    }

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistKey]);

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
    if (isComplete) {
      celebrateSolve();
    }
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
        playedLive,
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
    // Re-entrant call while the previous submission is still in flight
    // (double-click, double-tap, or an impatient re-click on a slow
    // connection) - see submittingRef's own doc comment for why this has
    // to be a synchronous guard, not just disabling the button, since the
    // button's own re-render isn't guaranteed to land before a second
    // click event is already queued.
    if (submittingRef.current) return;
    submittingRef.current = true;

    const { row, col } = activeCell;

    let result;
    try {
      result = await submitGuess(puzzle.id, { row, col, itemId: item.id, sessionId: getSessionId() });
    } catch (err) {
      // Should never happen for a legitimate client in sync with the
      // server's own guess count (see PuzzleService.checkGuess) - this is
      // just a safety net for a rare desync (e.g. two tabs racing past the
      // storage-event resync below) or a network error. Closes the input
      // rather than silently pretending the guess succeeded or crashing the
      // click handler with an unhandled rejection.
      console.error('Failed to submit guess', err);
      setActiveCell(null);
      submittingRef.current = false;
      return;
    }

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
    submittingRef.current = false;
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
