import type {
  PuzzleResponse,
  GuessRequest,
  GuessResponse,
  GridItem,
  GameCategoriesResponse,
  UnlimitedPuzzleRequest,
} from '../types/puzzle';

const BASE_URL = 'http://localhost:8080/api';

export async function fetchTodaysPuzzle(game: string = 'genshin'): Promise<PuzzleResponse> {
  const res = await fetch(`${BASE_URL}/puzzle/today?game=${game}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch today's puzzle: ${res.status}`);
  }
  return res.json();
}

export async function submitGuess(puzzleId: string, guess: GuessRequest): Promise<GuessResponse> {
  const res = await fetch(`${BASE_URL}/puzzle/${puzzleId}/guess`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(guess),
  });
  if (!res.ok) {
    throw new Error(`Failed to submit guess: ${res.status}`);
  }
  return res.json();
}

export async function fetchItems(game: string = 'genshin'): Promise<GridItem[]> {
  const res = await fetch(`${BASE_URL}/items?game=${game}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch items: ${res.status}`);
  }
  return res.json();
}

export async function fetchGameCategories(game: string): Promise<GameCategoriesResponse> {
  const res = await fetch(`${BASE_URL}/games/${game}/categories`);
  if (!res.ok) {
    throw new Error(`Failed to fetch categories: ${res.status}`);
  }
  return res.json();
}

export async function generateUnlimitedPuzzle(
  game: string,
  filters: UnlimitedPuzzleRequest
): Promise<PuzzleResponse> {
  const res = await fetch(`${BASE_URL}/puzzle/unlimited?game=${game}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters),
  });
  if (!res.ok) {
    const message = await res.text().catch(() => '');
    throw new Error(message || `Failed to generate puzzle: ${res.status}`);
  }
  return res.json();
}