import { useEffect, useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { isValidGameId } from '../config/games';
import { useAuth } from '../auth/AuthProvider';
import { fetchCompletedDates } from '../api/client';
import HelpButton from '../components/HelpButton';
import HelpModal from '../components/HelpModal';
import LoadingSpinner from '../components/LoadingSpinner';
import NotFoundPage from './NotFoundPage';

const ARCHIVE_WINDOW_DAYS = 30;
// The real site's go-live date - mirrors the backend's ARCHIVE_LAUNCH_DATE
// env var (see PuzzleController.archive), which is the actual enforcement
// boundary; this just keeps the visible list from offering a date the
// backend would reject anyway. Self-resolving: once ARCHIVE_WINDOW_DAYS
// has passed since this date, the rolling window is entirely after it and
// this constant stops doing anything.
const LAUNCH_DATE = '2026-08-24';

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
    const dateStr = toLocalDateString(d);
    if (dateStr >= LAUNCH_DATE) {
      dates.push(dateStr);
    }
  }
  return dates;
}

const WEEK_GROUP_SIZE = 7;

function shortLabel(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function yearOf(date: string): number {
  return new Date(date + 'T00:00:00').getFullYear();
}

// Chunks the 30 dates (most-recent-first) into rolling 7-day groups, each
// labeled by its own date range - a lighter-weight grouping than real
// calendar weeks (which would need to know what weekday "yesterday" falls
// on), but it's what actually keeps a 30-row list scannable, which is the
// only thing this grouping is for.
//
// Every group's label carries its year, even when it repeats the same
// number as its neighbors - deliberately consistent rather than only
// showing it where it changes. A group whose own two ends straddle a year
// boundary (e.g. late Dec into early Jan) spells out both years rather
// than picking just one.
function groupByWeek(dates: string[]): { label: string; dates: string[] }[] {
  const groups: { label: string; dates: string[] }[] = [];

  for (let i = 0; i < dates.length; i += WEEK_GROUP_SIZE) {
    const chunk = dates.slice(i, i + WEEK_GROUP_SIZE);
    const oldest = chunk[chunk.length - 1];
    const newest = chunk[0];
    const oldestYear = yearOf(oldest);
    const newestYear = yearOf(newest);

    let label: string;
    if (chunk.length === 1) {
      // A trailing group of exactly one date - "Jul 24 - Jul 24, 2026"
      // would be a redundant self-range (oldest and newest are literally
      // the same date here). Not reachable with today's 30/7 combination
      // (always leaves a remainder of 2+), but a real case for other
      // ARCHIVE_WINDOW_DAYS/WEEK_GROUP_SIZE combinations.
      label = `${shortLabel(oldest)}, ${oldestYear}`;
    } else if (oldestYear !== newestYear) {
      label = `${shortLabel(oldest)}, ${oldestYear} – ${shortLabel(newest)}, ${newestYear}`;
    } else {
      label = `${shortLabel(oldest)} – ${shortLabel(newest)}, ${oldestYear}`;
    }
    groups.push({ label, dates: chunk });
  }
  return groups;
}

export default function ArchiveListPage() {
  const { game } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const validGame = isValidGameId(game) ? game : undefined;
  // date -> {playedLive, score}, not just a Set - a date completed live
  // (back when it was still today) reads differently from one completed
  // later via Archive, since only the live ones count toward career
  // stats/streaks; score is shown alongside the completed badge.
  const [completedDates, setCompletedDates] = useState<Map<string, { playedLive: boolean; score: number }> | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (!user || !validGame) return;
    fetchCompletedDates(validGame)
      .then((dates) => setCompletedDates(new Map(dates.map((d) => [d.date, { playedLive: d.playedLive, score: d.score }]))))
      .catch(() => setCompletedDates(new Map()));
  }, [user, validGame]);

  if (!validGame) {
    return <NotFoundPage />;
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

      <div className="w-full max-w-md flex flex-col gap-5">
        {pastDates().length === 0 ? (
          // Genuinely reachable, not just a theoretical edge case: for the
          // first ARCHIVE_WINDOW_DAYS after a fresh launch, every date the
          // rolling window would otherwise offer is before LAUNCH_DATE and
          // gets filtered out entirely - an unexplained empty div here (the
          // silent default before this existed) reads as broken rather than
          // "there's genuinely nothing here yet".
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
            Nothing archived yet.
          </p>
        ) : (
          groupByWeek(pastDates()).map((group) => (
          <div key={group.label} className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-600 px-1">
              {group.label}
            </span>
            {group.dates.map((date) => {
              const info = completedDates?.get(date);
              const completed = info !== undefined;
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full px-2.5 py-0.5 tabular-nums">
                        {info.score}/9
                      </span>
                      <span
                        title={info.playedLive ? "Completed via Daily Puzzle" : "Completed via Archive"}
                        className={`text-xs font-semibold uppercase tracking-wide ${
                          info.playedLive
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-gray-400 dark:text-gray-600'
                        }`}
                      >
                        Completed
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
          ))
        )}
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
