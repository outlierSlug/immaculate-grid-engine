import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exchangeAuthCode } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import LoadingSpinner from '../components/LoadingSpinner';

// Lands here after Google -> our backend's redirect, with a short-lived
// exchange code in the URL fragment (never a query string - see
// GoogleAuthSuccessHandler's doc comment). Strips the fragment immediately
// so the code never lingers in browser history, then exchanges it for the
// real bearer token via a POST (token comes back in the response body only).
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  // StrictMode double-invokes effects in dev - this one reads-then-clears
  // the URL fragment, which isn't idempotent (the second invocation would
  // see an already-empty hash and briefly flash an error before the first
  // invocation's real exchange resolves and navigates away). This ref makes
  // the actual side effect run exactly once regardless.
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const code = params.get('code');
    window.history.replaceState(null, '', window.location.pathname);

    if (!code) {
      setError('Missing login code.');
      return;
    }

    exchangeAuthCode(code)
      .then(({ token, user }) => {
        login(token, user);
        navigate('/', { replace: true });
      })
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <main className="flex flex-col items-center justify-center gap-3 min-h-[60vh] px-6 text-center">
        <p className="text-red-600 dark:text-red-400">Sign-in failed: {error}</p>
      </main>
    );
  }

  return (
    <main className="flex items-center justify-center min-h-[60vh]">
      <LoadingSpinner label="Signing you in..." size="lg" />
    </main>
  );
}
