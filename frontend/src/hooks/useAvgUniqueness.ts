import { useEffect, useState } from 'react';
import { fetchPuzzleStats } from '../api/client';
import { getSessionId } from '../utils/session';
import { computeLiveUniquenessScore } from '../utils/uniqueness';
import type { UserGameStats } from '../types/puzzle';

// Extracted from ProfilePage's own GameStatsCard so PuzzleSummaryModal can
// show the same figure without duplicating the fan-out - reuses the
// single-puzzle /stats endpoint + the same client-side uniqueness formula
// used mid-game (utils/uniqueness.ts) rather than the backend computing
// this, per UserStatsResponse's own doc comment. null while loading, still
// null indefinitely if gameStats is null/has no puzzles yet.
export function useAvgUniqueness(gameStats: UserGameStats | null): number | null {
  const [avgUniqueness, setAvgUniqueness] = useState<number | null>(null);

  useEffect(() => {
    if (!gameStats || gameStats.puzzles.length === 0) return;
    let cancelled = false;

    const sessionId = getSessionId();
    Promise.all(
      gameStats.puzzles.map(async (p) => {
        const puzzleStats = await fetchPuzzleStats(p.puzzleId, sessionId);
        if (!puzzleStats) return null;
        // true: every puzzle here is already a completed, server-recorded
        // attempt (that's how it ended up in gameStats.puzzles at all).
        return computeLiveUniquenessScore(p.cellAnswers, puzzleStats.perCell, true);
      })
    ).then((scores) => {
      if (cancelled) return;
      const valid = scores.filter((s): s is number => s !== null);
      if (valid.length > 0) {
        setAvgUniqueness(Math.round(valid.reduce((sum, s) => sum + s, 0) / valid.length));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [gameStats]);

  return avgUniqueness;
}
