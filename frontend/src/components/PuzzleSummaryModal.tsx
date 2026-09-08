import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { fetchUserStats } from '../api/client';
import type { UserGameStats } from '../types/puzzle';
import DiscordPromptBanner from './DiscordPromptBanner';
import SignInModal from './SignInModal';

// Always the real production domain, never the request's own origin - same
// reasoning as ShareResultRow's own SITE_ORIGIN.
const SITE_ORIGIN = 'https://gachagrid.com';

interface PuzzleSummaryModalProps {
  onClose: () => void;
  onViewStats: () => void;
  gameId: string;
  gameLabel: string;
  puzzleDate: string;
  score: number;
  totalCells: number;
  // "row-col" keys this player answered correctly - drives the share
  // text's emoji grid, same convention as ShareResultRow.
  correctCellKeys: Set<string>;
  rowCount: number;
  colCount: number;
  // This specific puzzle's own live UNIQ score/percentile (same
  // value/formula as the in-grid UniquenessScore side-column stat) - not
  // the cross-puzzle average ProfilePage shows under the same "UNIQ" label.
  // Shown regardless of login state, unlike Puzzles Played/Daily Streak
  // below, which need an account to mean anything.
  uniquenessScore: number | null;
  uniquenessPercentile: number | null;
  // This puzzle's community-wide highest uniqueness seen so far (same
  // value PuzzleStatsPanel already shows as "Most Unique") - the share
  // text's "best possible" figure.
  mostUniqueScore: number | null;
}

// One-time "you're done" moment for today's Daily, shown automatically on
// the isGameOver false->true transition (see usePuzzleGuesses' onGameOver
// option) and reopenable on demand via the "Summary" button it leaves
// behind. Consolidates the Discord prompt (moved in from its old inline
// spot, not duplicated) and a player's stats/streak (new) - the
// share/countdown row deliberately stays only in PuzzleStatsPanel, not
// duplicated in here.
export default function PuzzleSummaryModal({
  onClose,
  onViewStats,
  gameId,
  gameLabel,
  puzzleDate,
  score,
  totalCells,
  correctCellKeys,
  rowCount,
  colCount,
  uniquenessScore,
  uniquenessPercentile,
  mostUniqueScore,
}: PuzzleSummaryModalProps) {
  const { user } = useAuth();
  const [gameStats, setGameStats] = useState<UserGameStats | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shareUrl = `${SITE_ORIGIN}/${gameId}`;

  function buildShareText(): string {
    const lines: string[] = [];
    for (let r = 0; r < rowCount; r++) {
      let line = '';
      for (let c = 0; c < colCount; c++) {
        line += correctCellKeys.has(`${r}-${c}`) ? '✅' : '🟥';
      }
      lines.push(line);
    }
    const summaryLines = [`GachaGrid - ${gameLabel} ${puzzleDate}`, `Score: ${score}/${totalCells}`];
    if (uniquenessScore != null) {
      summaryLines.push(
        mostUniqueScore != null
          ? `Uniqueness: ${uniquenessScore} (best possible: ${mostUniqueScore})`
          : `Uniqueness: ${uniquenessScore}`
      );
    }
    if (uniquenessPercentile != null) summaryLines.push(`Better than ${uniquenessPercentile.toFixed(1)}% of players today`);
    return [...summaryLines, '', ...lines, '', shareUrl].join('\n');
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(buildShareText());
      setCopied(true);
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied/unavailable - nothing more to do
      // here, there's no popover fallback in this compact layout.
    }
  }

  async function handleShare() {
    // Native share sheet where available (most phones) - distinct from the
    // explicit Copy button below, since this opens the OS share flow
    // instead of just copying text. Falls back to a plain copy only where
    // navigator.share doesn't exist at all (most desktop browsers), so the
    // button still does something rather than silently no-op there.
    if (navigator.share) {
      try {
        await navigator.share({ text: buildShareText() });
        return;
      } catch {
        // Cancelled or failed - fall through to the clipboard path below.
      }
    }
    await copyToClipboard();
  }

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchUserStats()
      .then((res) => {
        if (cancelled) return;
        setGameStats(res.games.find((g) => g.gameId === gameId) ?? null);
      })
      .catch(() => {
        // Leaves gameStats null - Puzzles Played/Daily Streak just fall
        // back to "--" below, same as the logged-out/still-loading cases.
      });
    return () => {
      cancelled = true;
    };
  }, [user, gameId]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const accountStatKnown = !!gameStats;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-lg w-full max-w-sm p-5 flex flex-col items-center gap-4 animate-[modal-in_0.15s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full relative text-center">
          <h2 className="font-bold text-xl">Puzzle Summary</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{gameLabel}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute -top-1 right-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-pointer text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="w-full flex flex-col items-center gap-3 border-y border-gray-200 dark:border-gray-800 py-4">
          <h3 className="font-semibold text-sm text-gray-500 dark:text-gray-400">Your Stats</h3>

          {!user && (
            <p className="text-sm text-gray-600 dark:text-gray-400 -mt-1">
              <button
                type="button"
                onClick={() => setSignInOpen(true)}
                className="text-indigo-600 dark:text-indigo-400 font-semibold underline hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer"
              >
                Login
              </button>{' '}
              to track games & streak
            </p>
          )}

          <div className="w-full grid grid-cols-3">
            <div className="flex flex-col items-center px-1">
              <div className="text-xs text-gray-500 dark:text-gray-400">Uniqueness</div>
              <div className="text-xl font-bold tabular-nums">{uniquenessScore ?? '—'}</div>
              {uniquenessPercentile != null && (
                <div className="text-[11px] text-gray-400 dark:text-gray-500 text-center leading-tight">
                  Better than {uniquenessPercentile.toFixed(1)}%
                </div>
              )}
            </div>
            <div className={`flex flex-col items-center ${accountStatKnown ? '' : 'text-gray-300 dark:text-gray-600'}`}>
              <div className="text-xs text-gray-500 dark:text-gray-400">Games Played</div>
              <div className="text-xl font-bold tabular-nums">{accountStatKnown ? gameStats.gamesPlayed : '—'}</div>
            </div>
            <div className={`flex flex-col items-center ${accountStatKnown ? '' : 'text-gray-300 dark:text-gray-600'}`}>
              <div className="text-xs text-gray-500 dark:text-gray-400">Daily Streak</div>
              <div className="text-xl font-bold tabular-nums flex items-center gap-1">
                <span aria-hidden="true">🔥</span>
                {accountStatKnown ? gameStats.currentStreak : '—'}
              </div>
            </div>
          </div>
        </div>

        <DiscordPromptBanner />

        <div className="w-full flex flex-col items-center gap-2">
          <h3 className="font-semibold text-sm text-gray-500 dark:text-gray-400">Share Results</h3>
          <div className="flex items-center gap-2">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(buildShareText())}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="w-3.5 h-3.5 fill-current">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Post
            </a>
            <button
              type="button"
              onClick={handleShare}
              aria-label="Share result"
              className="grid place-items-center w-10 h-10 shrink-0 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.6" y1="10.6" x2="15.4" y2="6.4" />
                <line x1="8.6" y1="13.4" x2="15.4" y2="17.6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
            >
              {copied ? (
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
              Copy
            </button>
          </div>
        </div>

        <div className="w-full flex flex-col gap-2">
          <button
            type="button"
            onClick={onViewStats}
            className="w-full px-4 py-2.5 rounded-full bg-indigo-600 text-white font-semibold shadow-sm hover:bg-indigo-700 transition cursor-pointer"
          >
            Puzzle Stats →
          </button>

          {user && (
            <Link
              to={`/${gameId}/archive`}
              className="w-full text-center px-4 py-2.5 rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              View Archive
            </Link>
          )}
        </div>
      </div>

      {signInOpen && <SignInModal onClose={() => setSignInOpen(false)} />}

      {copied && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 px-4 py-2.5 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold shadow-lg animate-[modal-in_0.15s_ease-out]"
          role="status"
        >
          Copied to clipboard!
        </div>
      )}
    </div>
  );
}
