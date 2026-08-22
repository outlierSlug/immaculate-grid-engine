import { getStoredAuth } from './auth';

const SESSION_ID_KEY = 'grid-session-id';

// One id per browser, not per puzzle/day - lets a player's history be linked
// together (and later, to a real account) without any login existing yet.
// That "later" is now: a signed-in user gets "user:{id}" instead, for every
// puzzle type (today's Daily included, not just Archive) - the backend
// verifies this claim against the caller's own resolved identity (see
// PuzzleStatsService's ownership check), so it can't be spoofed. Falls back
// to the anonymous UUID exactly as before when logged out.
export function getSessionId(): string {
  const auth = getStoredAuth();
  if (auth) {
    return `user:${auth.user.id}`;
  }

  let id = localStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}
