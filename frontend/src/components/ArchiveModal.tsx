import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCompletedDates } from '../api/client';
import { shortDateLabel } from '../utils/dateIso';
import type { GameId } from '../config/games';

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

// Yesterday back through ARCHIVE_WINDOW_DAYS ago - today itself isn't in
// this list, it's the "Today's Puzzle" row rendered above it.
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
      label = `${shortDateLabel(oldest)}, ${oldestYear}`;
    } else if (oldestYear !== newestYear) {
      label = `${shortDateLabel(oldest)}, ${oldestYear} – ${shortDateLabel(newest)}, ${newestYear}`;
    } else {
      label = `${shortDateLabel(oldest)} – ${shortDateLabel(newest)}, ${oldestYear}`;
    }
    groups.push({ label, dates: chunk });
  }
  return groups;
}

interface ArchiveModalProps {
  game: GameId;
  // Which row you're currently on, highlighted so it's obvious where you
  // are when switching between days: an archived date, the literal
  // 'today' for the live Daily, or undefined when the modal is opened
  // somewhere with no puzzle behind it at all (the profile page) - there,
  // nothing should look selected.
  current?: string;
  onClose: () => void;
}

export const CURRENT_IS_TODAY = 'today';

// Ring *colour* is deliberately not in the shared part: appending an
// indigo ring to a class string that already sets ring-black/5 leaves two
// rules setting the same property at equal specificity, so which one wins
// comes down to Tailwind's generated source order, not the order they're
// written here - the current row's highlight was silently losing that.
const ROW_CLASS =
  'flex items-center justify-between px-4 py-2.5 rounded-lg bg-white dark:bg-gray-900 transition';
const DEFAULT_ROW_RING = 'ring-1 ring-black/5 dark:ring-white/10 hover:ring-indigo-300 dark:hover:ring-indigo-500/50';
// The day you're on is marked by its border alone - a "Playing" pill said
// the same thing twice and crowded the row's right side, which already
// carries a score and a completed badge.
const CURRENT_ROW_RING = 'ring-2 ring-indigo-500 dark:ring-indigo-400';

// The Archive as a modal over whatever puzzle you're on, rather than its
// own page: picking a past day is choosing *which* Daily to play, not a
// separate mode like Unlimited or Collection, and this way switching
// between two archived days never leaves the board. Opened from the
// heading's Archive button, and by the /:game/archive URL, which older
// links (the profile card, the post-Daily summary) still point at.
export default function ArchiveModal({ game, current, onClose }: ArchiveModalProps) {
  // Only the per-row completion badges wait on this: the dates themselves
  // are computed locally, so the list renders immediately and the badges
  // fill in. A spinner here would have been a second one on top of the
  // page's own (visible together when this opens over a still-loading
  // board) for data that decorates rows rather than producing them.
  //
  // date -> {playedLive, score}, not just a Set - a date completed live
  // (back when it was still today) reads differently from one completed
  // later via Archive, since only the live ones count toward career
  // stats/streaks; score is shown alongside the completed badge.
  const [completedDates, setCompletedDates] = useState<Map<string, { playedLive: boolean; score: number }> | null>(null);

  useEffect(() => {
    fetchCompletedDates(game)
      .then((dates) => setCompletedDates(new Map(dates.map((d) => [d.date, { playedLive: d.playedLive, score: d.score }]))))
      .catch(() => setCompletedDates(new Map()));
  }, [game]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const dates = pastDates();

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-start justify-center pt-20 px-4 z-50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Archive"
        className="bg-gray-50 dark:bg-gray-950 rounded-2xl shadow-xl ring-1 ring-black/5 dark:ring-white/10 w-full max-w-md h-[75vh] flex flex-col animate-[modal-in_0.15s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative px-5 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-bold text-lg tracking-tight">Archive</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Daily Puzzles from up to the last {ARCHIVE_WINDOW_DAYS} days.
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-pointer text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* h-[75vh] rather than max-h: the completed-dates fetch lands a
            beat after the modal opens, and sizing to the spinner first made
            the whole dialog snap to full height when the list arrived. */}
        <div className="overflow-y-auto scrollbar-slim flex-1 px-5 py-4 flex flex-col gap-5">
          {/* Today is its own row rather than part of the dated list - it's
              the one entry that isn't archived, and it doubles as the way
              back to today from an archived day. */}
          <Link to={`/${game}`} onClick={onClose} className={`${ROW_CLASS} ${current === CURRENT_IS_TODAY ? CURRENT_ROW_RING : DEFAULT_ROW_RING}`}>
            <span className="font-semibold">Today's Puzzle</span>
          </Link>

          {dates.length === 0 ? (
            // Genuinely reachable, not just a theoretical edge case: for the
            // first ARCHIVE_WINDOW_DAYS after a fresh launch, every date the
            // rolling window would otherwise offer is before LAUNCH_DATE and
            // gets filtered out entirely - an unexplained empty div here
            // reads as broken rather than "there's genuinely nothing here".
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Nothing archived yet.</p>
          ) : (
            groupByWeek(dates).map((group) => (
              <div key={group.label} className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-600 px-1">
                  {group.label}
                </span>
                {group.dates.map((date) => {
                  // Undefined until the fetch lands - the row renders either
                  // way and just gains its badge a moment later.
                  const info = completedDates?.get(date);
                  const completed = info !== undefined;
                  const isCurrent = date === current;
                  const label = new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  });
                  return (
                    <Link
                      key={date}
                      to={`/${game}/archive/${date}`}
                      onClick={onClose}
                      className={`${ROW_CLASS} ${isCurrent ? CURRENT_ROW_RING : DEFAULT_ROW_RING}`}
                    >
                      <span className="font-medium">{label}</span>
                      <div className="flex items-center gap-2">
                        {completed && (
                          <>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full px-2.5 py-0.5 tabular-nums">
                              {info.score}/9
                            </span>
                            <span
                              title={info.playedLive ? 'Completed via Daily Puzzle' : 'Completed via Archive'}
                              className={`text-xs font-semibold uppercase tracking-wide ${
                                info.playedLive
                                  ? 'text-indigo-600 dark:text-indigo-400'
                                  : 'text-gray-400 dark:text-gray-600'
                              }`}
                            >
                              Completed
                            </span>
                          </>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))
          )}

          <div className="flex flex-col gap-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800 pt-4">
            <p>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">COMPLETED</span> in indigo means you
              finished that puzzle live, on its actual day, and it counts toward your stats.
            </p>
            <p>
              <span className="font-semibold text-gray-500 dark:text-gray-500">COMPLETED</span> in gray means you
              finished it later via Archive. It still contributes to that puzzle's community pick-rate data, but not to
              your personal games-played or average-score stats, or your collection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
