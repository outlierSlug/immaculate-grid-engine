const SESSION_ID_KEY = 'grid-session-id';

// One id per browser, not per puzzle/day - lets a player's history be linked
// together (and later, to a real account) without any login existing yet.
export function getSessionId(): string {
  let id = localStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}
