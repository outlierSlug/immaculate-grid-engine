import { useEffect, useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { fetchUserStats, fetchPuzzleStats, deleteAccount } from '../api/client';
import { getSessionId } from '../utils/session';
import { computeLiveUniquenessScore } from '../utils/uniqueness';
import { GAMES, isValidGameId } from '../config/games';
import type { UserGameStats } from '../types/puzzle';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import UserAvatar from '../components/UserAvatar';
import ConfirmModal from '../components/ConfirmModal';

interface GameStatsCardProps {
  gameStats: UserGameStats;
}

// One game's stats, with its own client-side average-uniqueness
// computation - kept as a self-contained component (rather than one big
// effect on the page) so each game's fan-out of per-puzzle /stats fetches
// runs independently and one game's data doesn't block another's from
// rendering.
function GameStatsCard({ gameStats }: GameStatsCardProps) {
  const [avgUniqueness, setAvgUniqueness] = useState<number | null>(null);

  useEffect(() => {
    if (gameStats.puzzles.length === 0) return;
    let cancelled = false;

    // Reuses the single-puzzle /stats endpoint + the same client-side
    // uniqueness formula used mid-game (utils/uniqueness.ts) rather than
    // the backend computing this - see UserStatsResponse's doc comment.
    const sessionId = getSessionId();
    Promise.all(
      gameStats.puzzles.map(async (p) => {
        const puzzleStats = await fetchPuzzleStats(p.puzzleId, sessionId);
        if (!puzzleStats) return null;
        // true: every puzzle here is already a completed, server-recorded
        // attempt (that's how it ended up in gameStats.puzzles at all).
        return computeLiveUniquenessScore(p.cellAnswers, puzzleStats.perCell, true);
      })
    ).then((scores) => {
      if (cancelled) return;
      const valid = scores.filter((s): s is number => s !== null);
      if (valid.length > 0) {
        setAvgUniqueness(Math.round(valid.reduce((sum, s) => sum + s, 0) / valid.length));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [gameStats]);

  const game = isValidGameId(gameStats.gameId) ? GAMES[gameStats.gameId] : undefined;
  const windowed = gameStats.puzzles.length > 0 && gameStats.puzzles.length < gameStats.gamesPlayed;

  return (
    <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-5 flex flex-col items-center gap-4">
      <div className="flex items-center gap-2">
        {game && <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${game.dotClass}`} aria-hidden="true" />}
        <h2 className="font-bold text-lg">{game?.label ?? gameStats.gameId}</h2>
      </div>

      <div className="flex gap-6 text-center">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Games Played</div>
          <div className="text-xl font-bold tabular-nums">{gameStats.gamesPlayed}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Score Avg</div>
          <div className="text-xl font-bold tabular-nums">{gameStats.avgScore.toFixed(1)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">UNIQ Avg</div>
          <div className="text-xl font-bold tabular-nums">{avgUniqueness ?? '—'}</div>
        </div>
      </div>

      {windowed && (
        <p className="text-xs text-gray-400 dark:text-gray-600 text-center -mt-1">
          Average uniqueness is based on your {gameStats.puzzles.length} most recent {game?.label ?? gameStats.gameId} puzzles, not your full history.
        </p>
      )}

      <Link
        to={`/${gameStats.gameId}/archive`}
        className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        View {game?.label ?? gameStats.gameId} Archive &rarr;
      </Link>
    </div>
  );
}

export default function ProfilePage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<UserGameStats[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setGames(null);
    setError(null);

    fetchUserStats()
      .then((result) => setGames(result.games))
      .catch((err) => setError(err.message));
  }, [user]);

  async function handleDeleteAccount() {
    setConfirmDeleteOpen(false);
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      logout();
      navigate('/');
    } catch (err) {
      setDeleting(false);
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account');
    }
  }

  if (authLoading) {
    return (
      <main className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="flex flex-col items-center gap-6 py-8 px-4 motion-safe:animate-[page-in_350ms_ease-out]">
      <div className="flex flex-col items-center gap-3">
        <UserAvatar avatarUrl={user.avatarUrl} displayName={user.displayName} sizeClass="w-20 h-20" textSizeClass="text-3xl font-bold" />
        <div className="text-center">
          <h1 className="text-2xl font-bold">{user.displayName}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
        </div>
      </div>

      {error && <ErrorState message={`Failed to load your stats: ${error}`} className="pt-2" />}

      {!error && !games && <LoadingSpinner label="Loading your stats..." size="md" className="pt-2" />}

      {!error && games && games.length === 0 && (
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-sm border-t border-gray-200 dark:border-gray-800 pt-6 w-full">
          No data yet. Play some daily puzzles while signed in!
        </p>
      )}

      {!error && games && games.length > 0 && (
        <div className="flex flex-col items-center gap-4 border-t border-gray-200 dark:border-gray-800 pt-6 w-full">
          {games.map((gameStats) => (
            <GameStatsCard key={gameStats.gameId} gameStats={gameStats} />
          ))}
        </div>
      )}

      <div className="flex flex-col items-center gap-2 border-t border-gray-200 dark:border-gray-800 pt-6 w-full">
        <button
          type="button"
          onClick={() => setConfirmDeleteOpen(true)}
          disabled={deleting}
          className="px-5 py-2.5 rounded-full border border-red-300 dark:border-red-800/70 text-red-600 dark:text-red-400 font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-400 dark:hover:border-red-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deleting ? 'Deleting account...' : 'Delete Account'}
        </button>
        {deleteError && (
          <p className="text-sm text-red-600 dark:text-red-400 text-center max-w-sm">{deleteError}</p>
        )}
      </div>

      {confirmDeleteOpen && (
        <ConfirmModal
          title="Delete your account?"
          message="This permanently deletes your profile and cannot be undone. All personal profile stats will be lost."
          confirmLabel="Delete Account"
          onConfirm={handleDeleteAccount}
          onCancel={() => setConfirmDeleteOpen(false)}
        />
      )}
    </main>
  );
}
