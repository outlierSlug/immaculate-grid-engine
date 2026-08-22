import type { CellStats } from '../types/puzzle';

const UNIQUENESS_CEILING = 900;

// Same formula as the backend's live per-attempt computation
// (PuzzleStatsService.computeLiveUniquenessScores): 900 minus a deduction
// per correctly-filled cell, sized by how common that pick was. An unfilled
// cell (or a filled one nobody else has a recorded answer for yet)
// contributes no deduction, which is equivalent to implicitly costing the
// full 100 - never special-cased separately. Computing this client-side
// (rather than only trusting a server-computed value) is what lets the UI
// show a live-updating score mid-game, before this session's attempt has
// even been submitted.
//
// selfAlreadyCounted picks between two genuinely different percent sources:
// - true: a leave-one-out share, excluding this attempt's own vote from
//   both numerator and denominator. Use this whenever the attempt being
//   scored is already reflected in the perCell snapshot passed in (a
//   just-submitted or previously-completed attempt, fetched fresh from the
//   server) - otherwise your own pick double-counts into "how common is my
//   own pick," which is exactly what let a 2-cell attempt tie a 9-cell one
//   when only 2 total attempts existed for a puzzle. See
//   PuzzleStatsService.computeLiveUniquenessScores's own doc comment for
//   the full reasoning - this mirrors it exactly.
// - false: the plain population percent straight off perCell, unadjusted.
//   Use this for the live in-progress score, computed against a perCell
//   snapshot fetched before this session's own picks were ever submitted -
//   "self" genuinely isn't in that data yet, so no correction applies.
//
// Takes itemIds directly (cellKey -> itemId), not full GridItems - the only
// thing this ever needed was the id, and this shape is also exactly what
// YourStats.cellAnswers / UserPuzzleSummary.cellAnswers already are, so the
// per-user stats page can run this same formula against past puzzles
// without first reconstructing GridItem objects it doesn't have.
export function computeLiveUniquenessScore(
  cellAnswers: Record<string, string>,
  perCell: Record<string, CellStats> | undefined,
  selfAlreadyCounted: boolean
): number {
  let deduction = 0;
  for (const [cellKey, itemId] of Object.entries(cellAnswers)) {
    const cellStats = perCell?.[cellKey];
    const answer = cellStats?.answers.find((a) => a.itemId === itemId);
    let percent: number;
    if (selfAlreadyCounted) {
      const cellTotal = cellStats?.correctAttempts ?? 0;
      percent = cellTotal <= 1 || !answer ? 0 : ((answer.count - 1) / (cellTotal - 1)) * 100;
    } else {
      percent = answer?.percent ?? 0;
    }
    deduction += 100 - percent;
  }
  return Math.max(0, Math.round(UNIQUENESS_CEILING - deduction));
}

// Percentile among finished attempts strictly worse (higher, since lower is
// more unique) than the candidate score — ties don't count either way. Same
// selfAlreadyCounted split as computeLiveUniquenessScore, and for the same
// reason: allScores is "every finished attempt for this puzzle," which
// includes the attempt being scored once it's been submitted (or was
// already completed elsewhere/earlier). worseCount itself never needs
// correcting - your own entry is never strictly greater than your own
// score, so it can't accidentally count as "worse than yourself" - but
// leaving it in the denominator dilutes the percentage against yourself,
// e.g. with only 2 total attempts (yours and one other, worse), you'd show
// as "better than 50%" instead of the correct 100% (you beat the one other
// player that exists). null when there's no one else to compare against.
export function computeUniquenessPercentile(
  score: number,
  allScores: number[],
  selfAlreadyCounted: boolean
): number | null {
  const otherCount = allScores.length - (selfAlreadyCounted ? 1 : 0);
  if (otherCount <= 0) return null;
  const worseCount = allScores.filter((s) => s > score).length;
  return (worseCount / otherCount) * 100;
}
