// Mirrors the backend's API DTOs (see docs/ARCHITECTURE.md's "API design"
// section) - when a response shape changes on the backend, this is the one
// place to update on the frontend; every component/hook imports from here
// rather than inlining its own shape.

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
  // true for a live /today submission, false for /archive - see the
  // backend SubmitAttemptRequest's doc comment for why this is set
  // explicitly here rather than inferred server-side later.
  playedLive: boolean;
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
  guessesUsed: number;
  gaveUp: boolean;
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

export interface UserResponse {
  id: number;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}

// cellAnswers is included specifically so the frontend can run the existing
// client-side uniqueness formula (utils/uniqueness.ts) against each of
// these puzzles' own /stats response - see UserStatsResponse's doc comment.
export interface UserPuzzleSummary {
  puzzleId: string;
  gameId: string;
  puzzleDate: string;
  score: number;
  solved: boolean;
  completedAt: string;
  cellAnswers: Record<string, string>;
}

// One game's slice of a signed-in user's history. gamesPlayed/avgScore are
// true all-time aggregates for that game specifically. puzzles is capped to
// the most recent ~60 per game (see backend UserStatsService) - any
// aggregate this list is used to derive client-side (e.g. average
// uniqueness) should be labeled as scoped to that window, not a true
// all-time figure.
export interface UserGameStats {
  gameId: string;
  gamesPlayed: number;
  avgScore: number;
  puzzles: UserPuzzleSummary[];
}

// One entry per date this user has completed for a given game. playedLive
// distinguishes a genuine same-day completion from one made later via
// Archive - only the live ones count toward gamesPlayed/avgScore above.
export interface CompletedDateInfo {
  date: string;
  playedLive: boolean;
  score: number;
}

// Organized by game, not combined - see UserGameStats.
export interface UserStatsResponse {
  games: UserGameStats[];
}