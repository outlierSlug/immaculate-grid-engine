import type {
  PuzzleResponse,
  GuessRequest,
  GuessResponse,
  GridItem,
  GameCategoriesResponse,
  UnlimitedPuzzleRequest,
  SubmitAttemptRequest,
  PuzzleStatsResponse,
  AuthResponse,
  UserResponse,
  UserStatsResponse,
  CompletedDateInfo,
} from '../types/puzzle';
import { getStoredAuth } from '../utils/auth';

// Falls back to the local dev backend so a fresh checkout works with no
// extra setup; set VITE_API_BASE_URL (frontend/.env) to point elsewhere.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

// Spring Security's OAuth2 endpoints live at the backend's origin root, not
// under /api (confirmed: http://localhost:8080/oauth2/authorization/google) -
// strip BASE_URL's /api suffix rather than duplicating a second origin
// constant. A real browser navigation (window.location.href = this), not a
// fetch - OAuth2 redirect flows require the browser itself to follow the
// redirect chain to Google and back.
const API_ORIGIN = BASE_URL.replace(/\/api\/?$/, '');
export const GOOGLE_SIGN_IN_URL = `${API_ORIGIN}/oauth2/authorization/google`;

// Reads the stored token directly rather than taking one as a parameter, so
// every call site below (new and existing alike) stays a plain fetch with
// no auth plumbing threaded through callers. Empty object when logged out -
// spreads into a fetch's headers as a no-op.
function authHeaders(): Record<string, string> {
  const auth = getStoredAuth();
  return auth ? { Authorization: `Bearer ${auth.token}` } : {};
}

export async function fetchTodaysPuzzle(game: string = 'genshin'): Promise<PuzzleResponse> {
  const res = await fetch(`${BASE_URL}/puzzle/today?game=${game}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch today's puzzle: ${res.status}`);
  }
  return res.json();
}

// Requires login - the backend 401s without a valid Authorization header.
export async function fetchArchivedPuzzle(game: string, date: string): Promise<PuzzleResponse> {
  const res = await fetch(`${BASE_URL}/puzzle/archive?game=${game}&date=${date}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const message = await res.text().catch(() => '');
    throw new Error(message || `Failed to fetch archived puzzle: ${res.status}`);
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
// Attaches the auth header when logged in - required, not optional, once
// sessionId is "user:{id}" (see utils/session.ts): the backend rejects a
// "user:" sessionId with 403 unless it matches the caller's own resolved
// token, so a logged-in player's attempts would silently fail to record
// without this, even for today's ordinary Daily puzzle.
export async function submitPuzzleAttempt(puzzleId: string, request: SubmitAttemptRequest): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/puzzle/${puzzleId}/attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
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
// just means rarity badges/stats don't show, never a broken page. Same auth
// header requirement as above, for the same reason.
export async function fetchPuzzleStats(puzzleId: string, sessionId: string): Promise<PuzzleStatsResponse | null> {
  try {
    const res = await fetch(`${BASE_URL}/puzzle/${puzzleId}/stats?sessionId=${encodeURIComponent(sessionId)}`, {
      headers: authHeaders(),
    });
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

// Exchanges the short-lived code from the OAuth redirect's URL fragment for
// a real bearer token - see AuthCallbackPage and the backend's LoginCode.
export async function exchangeAuthCode(code: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/auth/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const message = await res.text().catch(() => '');
    throw new Error(message || `Failed to exchange login code: ${res.status}`);
  }
  return res.json();
}

// Revalidates a stored token - null (never throws) on any failure, so
// AuthProvider can treat "logged out" and "stale/revoked token" the same
// way on mount instead of crashing the app over an expired session.
export async function fetchCurrentUser(): Promise<UserResponse | null> {
  const auth = getStoredAuth();
  if (!auth) return null;
  try {
    const res = await fetch(`${BASE_URL}/auth/me`, { headers: authHeaders() });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Best-effort - AuthProvider already clears local state regardless of
// whether this succeeds, so a network failure here shouldn't block logout.
export async function logout(): Promise<void> {
  try {
    await fetch(`${BASE_URL}/auth/logout`, { method: 'POST', headers: authHeaders() });
  } catch {
    // Local state is cleared by the caller either way.
  }
}

// Unlike logout, this genuinely needs to succeed or fail visibly - the
// caller shouldn't clear local state and act like the account is gone if
// the server-side delete never happened.
export async function deleteAccount(): Promise<void> {
  const res = await fetch(`${BASE_URL}/auth/me`, { method: 'DELETE', headers: authHeaders() });
  if (!res.ok) {
    const message = await res.text().catch(() => '');
    throw new Error(message || `Failed to delete account: ${res.status}`);
  }
}

export async function fetchUserStats(): Promise<UserStatsResponse> {
  const res = await fetch(`${BASE_URL}/users/me/stats`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`Failed to fetch your stats: ${res.status}`);
  }
  return res.json();
}

// Separate from fetchUserStats on purpose - "have I completed this puzzle
// at all" (for marking Archive dates as done) isn't filtered by
// playedLive the way the career-stats aggregate is.
export async function fetchCompletedDates(game: string): Promise<CompletedDateInfo[]> {
  const res = await fetch(`${BASE_URL}/users/me/completed-dates?game=${game}`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`Failed to fetch completed dates: ${res.status}`);
  }
  return res.json();
}