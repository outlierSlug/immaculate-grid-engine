import { useEffect } from 'react';
import type { CellStats } from '../types/puzzle';
import { useAuth } from '../auth/AuthProvider';

interface CommunityAnswersModalProps {
  rowLabel: string;
  colLabel: string;
  cellStats: CellStats;
  yourItemId?: string | null;
  onClose: () => void;
  avatarShapeClass: string;
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
  if (avatarUrl) {
    return <img src={avatarUrl} alt="Your pick" className="w-5 h-5 rounded-full shrink-0" />;
  }
  return (
    <span
      className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/30 dark:text-indigo-200 font-semibold text-[10px] shrink-0"
      aria-label="Your pick"
    >
      {displayName.charAt(0).toUpperCase()}
    </span>
  );
}

export default function CommunityAnswersModal({
  rowLabel,
  colLabel,
  cellStats,
  yourItemId,
  onClose,
  avatarShapeClass,
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
                  className={`w-9 h-9 ${avatarShapeClass} object-cover border border-gray-200 dark:border-gray-700 shrink-0`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate flex-1 min-w-0">
                      {answer.displayName}
                    </span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 tabular-nums shrink-0 whitespace-nowrap">
                      {answer.percent > 0 && answer.percent < 1 ? '<1' : Math.round(answer.percent)}% ({answer.count})
                    </span>
                    {isYours && (user ? (
                      <YourPickAvatar displayName={user.displayName} avatarUrl={user.avatarUrl} />
                    ) : (
                      <YourPickIcon />
                    ))}
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 mt-1 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-600"
                      style={{
                        width: `${answer.percent}%`,
                        backgroundImage:
                          'repeating-linear-gradient(135deg, rgba(255,255,255,0.45) 0px, rgba(255,255,255,0.45) 2px, transparent 2px, transparent 6px)',
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
