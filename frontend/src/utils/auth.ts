import type { UserResponse } from '../types/puzzle';

const AUTH_KEY = 'gachagrid-auth';

export interface StoredAuth {
  token: string;
  user: UserResponse;
}

// Plain localStorage read/write, no React dependency - mirrors session.ts's
// minimalism, and deliberately kept readable from session.ts directly
// (getSessionId needs to know whether a user is logged in) without either
// file depending on AuthProvider/React context.
export function getStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.token === 'string' && parsed.user) {
      return parsed as StoredAuth;
    }
    return null;
  } catch {
    return null;
  }
}

export function setStoredAuth(auth: StoredAuth): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function clearStoredAuth(): void {
  localStorage.removeItem(AUTH_KEY);
}
