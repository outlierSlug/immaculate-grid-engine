import { useEffect } from 'react';
import type { CellStats } from '../types/puzzle';
import { useAuth } from '../auth/AuthProvider';
import UserAvatar from './UserAvatar';
import { formatPercent } from '../utils/formatPercent';

interface CommunityAnswersModalProps {
  rowLabel: string;
  colLabel: string;
  cellStats: CellStats;
  yourItemId?: string | null;
  onClose: () => void;
  avatarShapeClass: string;
  avatarAspectClass: string;
  avatarBorderClass: string;
}

// Generic gray avatar marking "this is what you picked" for an anonymous
// viewer - deliberately not tied to any real identity, just a same-shape
// stand-in. A signed-in viewer gets their actual profile picture instead
// (see YourPickAvatar below), since there's a real identity to show.
function YourPickIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-label="Your pick">
      <circle cx="12" cy="12" r="12" fill="#e5e7eb" />
      <circle cx="12" cy="9.5" r="3.5" fill="#9ca3af" />
      <path d="M4.5 20c1.1-3.7 4-5.8 7.5-5.8s6.4 2.1 7.5 5.8" fill="#9ca3af" />
    </svg>
  );
}

// Signed-in viewer's own pick marker - their real Google profile picture,
// or their display name's initial letter when Google gave no photo
// (matching Header's own avatar-fallback convention).
function YourPickAvatar({ displayName, avatarUrl }: { displayName: string; avatarUrl: string | null }) {
  return (
    <UserAvatar avatarUrl={avatarUrl} displayName={displayName} sizeClass="w-5 h-5" textSizeClass="text-[10px]" alt="Your pick" />
  );
}

export default function CommunityAnswersModal({
  rowLabel,
  colLabel,
  cellStats,
  yourItemId,
  onClose,
  avatarShapeClass,
  avatarAspectClass,
  avatarBorderClass,
}: CommunityAnswersModalProps) {
  const { user } = useAuth();

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const { answers, totalAttempts, correctAttempts } = cellStats;
  const solveRate = totalAttempts > 0 ? (correctAttempts * 100) / totalAttempts : 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center pt-16 z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-[calc(100vw-2rem)] max-w-108 max-h-[70vh] flex flex-col animate-[modal-in_0.15s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-center">Community Answers</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-pointer text-lg leading-none"
          >
            ✕
          </button>
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 mt-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="uppercase tracking-wide">{rowLabel}</span>
            <span>/</span>
            <span className="uppercase tracking-wide">{colLabel}</span>
          </div>
          <div className="flex justify-center mt-2">
            <span className="inline-flex px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
              {solveRate.toFixed(0)}% guessed correctly
            </span>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-3">
          {answers.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No one has solved this cell yet.</p>
          )}
          {answers.map((answer) => {
            const isYours = yourItemId != null && answer.itemId === yourItemId;
            return (
              <div key={answer.itemId} className="flex items-start gap-3 p-2 rounded-lg">
                <img
                  src={answer.imageUrl ?? undefined}
                  alt={answer.displayName}
                  className={`h-9 ${avatarAspectClass} ${avatarShapeClass} object-cover ${avatarBorderClass} shrink-0`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate flex-1 min-w-0">
                      {answer.displayName}
                    </span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 tabular-nums shrink-0 whitespace-nowrap">
                      {formatPercent(answer.percent)} ({answer.count})
                    </span>
                    {isYours && (user ? (
                      <YourPickAvatar displayName={user.displayName} avatarUrl={user.avatarUrl} />
                    ) : (
                      <YourPickIcon />
                    ))}
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 mt-1 overflow-hidden">
                    <div
                      // Two background-image layers, not a Tailwind bg-linear-to-r
                      // utility - the diagonal stripe needs to sit on its own
                      // layer above the gradient (the color stops alone would
                      // otherwise get overwritten by a second backgroundImage).
                      // The gradient's own colors stay theme-aware via CSS
                      // custom properties set through dark: classes, same as
                      // every other themed color in this codebase - only the
                      // stripe pattern itself (identical in both themes) and
                      // the computed width are inline.
                      className="h-full rounded-full [--fill-from:var(--color-indigo-400)] [--fill-to:var(--color-indigo-600)] dark:[--fill-from:var(--color-indigo-700)] dark:[--fill-to:var(--color-indigo-400)]"
                      style={{
                        width: `${answer.percent}%`,
                        backgroundImage:
                          'repeating-linear-gradient(135deg, rgba(255,255,255,0.4) 0px, rgba(255,255,255,0.4) 2px, transparent 2px, transparent 6px), linear-gradient(to right, var(--fill-from), var(--fill-to))',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
