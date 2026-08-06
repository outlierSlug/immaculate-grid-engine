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