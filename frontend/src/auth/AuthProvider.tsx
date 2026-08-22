import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getStoredAuth, setStoredAuth, clearStoredAuth } from '../utils/auth';
import { fetchCurrentUser, logout as logoutRequest } from '../api/client';
import type { UserResponse } from '../types/puzzle';

interface AuthContextValue {
  user: UserResponse | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: UserResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const initial = getStoredAuth();
  const [user, setUser] = useState<UserResponse | null>(initial?.user ?? null);
  const [token, setToken] = useState<string | null>(initial?.token ?? null);
  // Starts true whenever a stored token exists - a stale/revoked token
  // (e.g. logged out on another device, or the dev DB was reset) needs to
  // fail safely rather than the UI trusting stale localStorage state as
  // truth. False immediately when there's nothing to revalidate.
  const [isLoading, setIsLoading] = useState(initial !== null);

  useEffect(() => {
    if (!initial) return;
    fetchCurrentUser()
      .then((freshUser) => {
        if (freshUser) {
          setUser(freshUser);
        } else {
          clearStoredAuth();
          setUser(null);
          setToken(null);
        }
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function login(nextToken: string, nextUser: UserResponse) {
    setStoredAuth({ token: nextToken, user: nextUser });
    setToken(nextToken);
    setUser(nextUser);
  }

  function logout() {
    // Best-effort server-side revocation - local state clears regardless,
    // matching logoutRequest's own "never throws" contract.
    logoutRequest();
    clearStoredAuth();
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
