import type { CellStats, GridItem } from '../types/puzzle';

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
export function computeLiveUniquenessScore(
  filledCells: Record<string, GridItem>,
  perCell: Record<string, CellStats> | undefined
): number {
  let deduction = 0;
  for (const [cellKey, item] of Object.entries(filledCells)) {
    const percent = perCell?.[cellKey]?.answers.find((a) => a.itemId === item.id)?.percent ?? 0;
    deduction += 100 - percent;
  }
  return Math.max(0, Math.round(UNIQUENESS_CEILING - deduction));
}

// Percentile among finished attempts strictly worse (higher, since lower is
// more unique) than the candidate score — ties don't count either way.
// null when there's nothing to compare against yet (no finished attempts).
export function computeUniquenessPercentile(score: number, allScores: number[]): number | null {
  if (allScores.length === 0) return null;
  const worseCount = allScores.filter((s) => s > score).length;
  return (worseCount / allScores.length) * 100;
}
