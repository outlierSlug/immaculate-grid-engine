import type {
  PuzzleResponse,
  GuessRequest,
  GuessResponse,
  GridItem,
  GameCategoriesResponse,
  UnlimitedPuzzleRequest,
  SubmitAttemptRequest,
  PuzzleStatsResponse,
} from '../types/puzzle';

// Falls back to the local dev backend so a fresh checkout works with no
// extra setup; set VITE_API_BASE_URL (frontend/.env) to point elsewhere.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

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

// Fire-and-forget: stats tracking is a nice-to-have, never something that
// should surface an error to the player or interrupt the game loop.
export async function submitPuzzleAttempt(puzzleId: string, request: SubmitAttemptRequest): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/puzzle/${puzzleId}/attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      console.error(`Failed to submit puzzle attempt: ${res.status}`);
    }
  } catch (err) {
    console.error('Failed to submit puzzle attempt', err);
  }
}

// Same fire-and-forget contract as submitPuzzleAttempt - a failed stats fetch
// just means rarity badges/stats don't show, never a broken page.
export async function fetchPuzzleStats(puzzleId: string, sessionId: string): Promise<PuzzleStatsResponse | null> {
  try {
    const res = await fetch(`${BASE_URL}/puzzle/${puzzleId}/stats?sessionId=${encodeURIComponent(sessionId)}`);
    if (!res.ok) {
      console.error(`Failed to fetch puzzle stats: ${res.status}`);
      return null;
    }
    return res.json();
  } catch (err) {
    console.error('Failed to fetch puzzle stats', err);
    return null;
  }
}