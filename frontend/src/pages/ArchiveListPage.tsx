import { useEffect, useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { isValidGameId } from '../config/games';
import { useAuth } from '../auth/AuthProvider';
import { fetchCompletedDates } from '../api/client';
import HelpButton from '../components/HelpButton';
import HelpModal from '../components/HelpModal';
import LoadingSpinner from '../components/LoadingSpinner';

const ARCHIVE_WINDOW_DAYS = 30;

// Local calendar date, not toISOString() (always UTC) - the two disagree
// for hours every day, which is exactly the bug that let today's own
// puzzle sneak into the archive as a seemingly-valid date (see
// PuzzleController.archive's doc comment). Using the same UTC-based
// approach here would just reintroduce an off-by-one version of the same
// bug in this list.
function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Yesterday back through ARCHIVE_WINDOW_DAYS ago - today itself isn't
// listed here, since it's already reachable as the main Daily page and
// showing it twice would just be redundant.
function pastDates(): string[] {
  const dates: string[] = [];
  for (let i = 1; i <= ARCHIVE_WINDOW_DAYS; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(toLocalDateString(d));
  }
  return dates;
}

export default function ArchiveListPage() {
  const { game } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const validGame = isValidGameId(game) ? game : undefined;
  // date -> playedLive, not just a Set - a date completed live (back when
  // it was still today) reads differently from one completed later via
  // Archive, since only the live ones count toward career stats/streaks.
  const [completedDates, setCompletedDates] = useState<Map<string, boolean> | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (!user || !validGame) return;
    fetchCompletedDates(validGame)
      .then((dates) => setCompletedDates(new Map(dates.map((d) => [d.date, d.playedLive]))))
      .catch(() => setCompletedDates(new Map()));
  }, [user, validGame]);

  if (!validGame) {
    return <Navigate to="/" replace />;
  }

  // Wait for AuthProvider's own revalidation before deciding to bounce a
  // page-refreshed, still-actually-logged-in visitor to the sign-in prompt.
  if (authLoading) {
    return (
      <main className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </main>
    );
  }

  if (!user) {
    return <Navigate to={`/${validGame}`} replace />;
  }

  return (
    <main className="flex flex-col items-center gap-5 py-8 px-4 motion-safe:animate-[page-in_350ms_ease-out]">
      <div className="flex items-center gap-2">
        {/* Invisible mirror of the HelpButton below, same size - keeps the
            centered flex row's midpoint under the h1 itself instead of
            shifting left to make room for a right-only icon. */}
        <div className="invisible" aria-hidden="true">
          <HelpButton onClick={() => {}} label="" />
        </div>
        <h1 className="text-2xl font-bold">Archive</h1>
        <HelpButton onClick={() => setHelpOpen(true)} label="About the Archive" />
      </div>
      <p className="text-gray-600 dark:text-gray-400 text-center max-w-sm -mt-2">
        Access Daily Puzzles from up to the last {ARCHIVE_WINDOW_DAYS} days.
      </p>

      <div className="w-full max-w-md flex flex-col gap-1.5">
        {pastDates().map((date) => {
          const playedLive = completedDates?.get(date);
          const completed = playedLive !== undefined;
          const label = new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });
          return (
            <Link
              key={date}
              to={`/${validGame}/archive/${date}`}
              className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-white dark:bg-gray-900 ring-1 ring-black/5 dark:ring-white/10 hover:ring-indigo-300 dark:hover:ring-indigo-500/50 transition"
            >
              <span className="font-medium">{label}</span>
              {completed && (
                <span
                  title={playedLive ? "Completed via Daily Puzzle" : "Completed via Archive"}
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    playedLive
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-400 dark:text-gray-600'
                  }`}
                >
                  Completed
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {helpOpen && (
        // Content lives here, not in a shared copy file - edit these
        // paragraphs directly to change what the (i) button next to
        // "Archive" shows.
        <HelpModal title="Archive" onClose={() => setHelpOpen(false)}>
          <p>
            Access Daily Puzzles from the last {ARCHIVE_WINDOW_DAYS} days.
          </p>
          <p>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">COMPLETED</span> in
            indigo means you finished that puzzle live, on its actual day and it counts toward your stats.
          </p>
          <p>
            <span className="font-semibold text-gray-500 dark:text-gray-500">COMPLETED</span> in gray
            means you finished it later via Archive. It still contributes to that puzzle's community
            pick-rate data, but not to your personal games-played or average-score stats.
          </p>
          <p>Accessing the Archive requires signing in.</p>
        </HelpModal>
      )}
    </main>
  );
}
