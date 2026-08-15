export interface PuzzleResponse {
  id: string;
  gameId: string;
  puzzleDate: string; // ISO date string, e.g. "2026-08-06"
  rowLabels: string[];
  colLabels: string[];
}

export interface GuessRequest {
  row: number;
  col: number;
  itemId: string;
}

export interface GuessResponse {
  correct: boolean;
  itemId: string;
  displayName: string;
  imageUrl: string | null;
}

export interface GridItem {
  id: string;
  gameId: string;
  displayName: string;
  imageUrl: string;
  attributes: Record<string, unknown>;
}

export interface CategoryOption {
  id: string;
  label: string;
}

export interface DimensionCategories {
  dimension: string;
  categories: CategoryOption[];
}

export interface GameCategoriesResponse {
  gameId: string;
  dimensions: DimensionCategories[];
}

export interface UnlimitedPuzzleRequest {
  dimensions?: string[];
  excludedCategoryIds?: string[];
  minAnswersPerCell?: number;
  requireSoftLockGuard?: boolean;
}

export interface SubmitAttemptRequest {
  sessionId: string;
  cellAnswers: Record<string, string>; // "row-col" -> itemId
  score: number;
  guessesUsed: number;
  solved: boolean;
  gaveUp: boolean;
  elapsedMs: number;
}

export interface CellAnswerStat {
  itemId: string;
  displayName: string;
  imageUrl: string | null;
  count: number;
  percent: number;
}

export interface CellStats {
  totalAttempts: number;
  correctAttempts: number;
  answers: CellAnswerStat[];
}

// score/cellAnswers are frozen facts read off the stored attempt row.
// Uniqueness score/percentile deliberately aren't here — the frontend
// derives both itself (see utils/uniqueness.ts) from cellAnswers + perCell
// + the sibling uniquenessScores list below, using the same formula whether
// the game is finished or still in progress.
export interface YourStats {
  score: number;
  cellAnswers: Record<string, string>;
}

// Every field here is recomputed live on every request from the current
// community data - nothing is cached, so two fetches for the same puzzle
// minutes apart can legitimately return different numbers as more people
// play. uniquenessScores is every finished attempt's live score, raw and
// unordered (no session identifiers) - purely fuel for a client-side
// percentile calculation against any candidate score.
export interface PuzzleStatsResponse {
  gamesPlayed: number;
  avgScore: number;
  mostUniqueScore: number | null;
  scoreDistribution: Record<string, number>;
  perCell: Record<string, CellStats>;
  uniquenessScores: number[];
  you: YourStats | null;
}