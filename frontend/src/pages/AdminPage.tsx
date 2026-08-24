import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { GAMES, type GameId } from '../config/games';
import { fetchAdminTracking } from '../api/client';
import AdminCuratePanel from '../components/AdminCuratePanel';
import AdminTrackingPanel from '../components/AdminTrackingPanel';
import AdminHistoryPanel from '../components/AdminHistoryPanel';
import NotFoundPage from './NotFoundPage';
import { todayIso, addDays } from '../utils/dateIso';

function tomorrowIso(): string {
  return addDays(todayIso(), 1);
}

// No nav link anywhere in the app points here - reached by a bookmarked
// URL only. Deliberately reveals nothing to anyone who isn't a confirmed
// admin: not logged in, still checking, or logged in but not on the
// server's ADMIN_EMAILS allowlist all render the exact same NotFoundPage
// a genuinely broken link would - never the real tabs/selectors shell,
// and never a "you're signed in but not admin" message that would itself
// confirm an admin surface exists at this URL. fetchAdminTracking is used
// as the up-front admin probe purely because it's already a side-effect-
// free read (unlike /pinned, which can auto-generate a placeholder puzzle)
// - not because tracking data is otherwise needed here.
export default function AdminPage() {
  const { user } = useAuth();
  const [section, setSection] = useState<'curate' | 'tracking' | 'history'>('curate');
  const [game, setGame] = useState<GameId>('genshin');
  const [date, setDate] = useState(tomorrowIso());
  // Pending/denied render identically (NotFoundPage) - the only thing this
  // needs to distinguish is "confirmed admin" from everything else,
  // including a transient network failure, which should fail safe (hide
  // real content) rather than be told apart from a genuine 403. No setState
  // for the !user case - the render check below (`!user || !isAdmin`)
  // already covers it, so the effect has nothing to synchronize when
  // there's no user to probe with.
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchAdminTracking('genshin')
      .then(() => setIsAdmin(true))
      .catch(() => setIsAdmin(false));
  }, [user]);

  if (!user || !isAdmin) {
    return <NotFoundPage />;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-5 py-8 motion-safe:animate-[page-in_350ms_ease-out]">
      <h1 className="text-2xl font-bold mb-1">Admin Page</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Curate future puzzles, track character/category appearances, and view archive history.
      </p>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 mb-6">
        {(['curate', 'tracking', 'history'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSection(s)}
            className={`px-1 pb-2.5 -mb-px border-b-2 font-bold text-sm capitalize cursor-pointer ${
              section === s
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {s === 'curate' ? 'Curate' : s === 'tracking' ? 'Tracking' : 'History'}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-8">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {Object.values(GAMES).map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGame(g.id as GameId)}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold cursor-pointer transition ${
                game === g.id
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/30 dark:text-indigo-200'
                  : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {section === 'curate' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDate(addDays(date, -1))}
              disabled={date <= tomorrowIso()}
              aria-label="Previous day"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-900 cursor-pointer"
            >
              ‹
            </button>
            <input
              type="date"
              value={date}
              min={tomorrowIso()}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300"
            />
            <button
              type="button"
              onClick={() => setDate(addDays(date, 1))}
              aria-label="Next day"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* key={section} forces a fresh mount on every tab switch (on top of
          the unmount/remount the mutually-exclusive conditionals below
          already do) so the fade-in reliably replays each time, the same
          "different content, same slot" transition every other page in this
          app gets on real navigation - see index.css's page-in comment. */}
      <div key={section} className="motion-safe:animate-[page-in_300ms_ease-out]">
        {section === 'curate' && <AdminCuratePanel game={game} date={date} />}
        {section === 'tracking' && <AdminTrackingPanel game={game} />}
        {section === 'history' && <AdminHistoryPanel game={game} />}
      </div>
    </div>
  );
}
