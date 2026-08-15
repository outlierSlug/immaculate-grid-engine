import { useEffect } from 'react';
import type { CellStats } from '../types/puzzle';

interface CommunityAnswersModalProps {
  rowLabel: string;
  colLabel: string;
  cellStats: CellStats;
  yourItemId?: string | null;
  onClose: () => void;
}

// Generic gray avatar marking "this is what you picked" — deliberately not
// tied to any real player identity, just a same-shape stand-in used for
// every viewer's own row.
function YourPickIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-label="Your pick">
      <circle cx="12" cy="12" r="12" fill="#e5e7eb" />
      <circle cx="12" cy="9.5" r="3.5" fill="#9ca3af" />
      <path d="M4.5 20c1.1-3.7 4-5.8 7.5-5.8s6.4 2.1 7.5 5.8" fill="#9ca3af" />
    </svg>
  );
}

export default function CommunityAnswersModal({ rowLabel, colLabel, cellStats, yourItemId, onClose }: CommunityAnswersModalProps) {
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
        className="bg-white rounded-lg shadow-lg w-[calc(100vw-2rem)] max-w-108 max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative px-4 pt-4 pb-3 border-b border-gray-100">
          <h2 className="font-bold text-center">Community Answers</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer text-lg leading-none"
          >
            ✕
          </button>
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-600 mt-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="uppercase tracking-wide">{rowLabel}</span>
            <span>/</span>
            <span className="uppercase tracking-wide">{colLabel}</span>
          </div>
          <div className="flex justify-center mt-2">
            <span className="inline-flex px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-semibold">
              {solveRate.toFixed(0)}% guessed correctly
            </span>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-3">
          {answers.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No one has solved this cell yet.</p>
          )}
          {answers.map((answer) => {
            const isYours = yourItemId != null && answer.itemId === yourItemId;
            return (
              <div key={answer.itemId} className="flex items-center gap-3 p-2 rounded-lg">
                <img
                  src={answer.imageUrl ?? undefined}
                  alt={answer.displayName}
                  className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-800 truncate">{answer.displayName}</span>
                  <div className="h-1.5 rounded-full bg-gray-100 mt-1 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-600"
                      style={{
                        width: `${answer.percent}%`,
                        backgroundImage:
                          'repeating-linear-gradient(135deg, rgba(255,255,255,0.45) 0px, rgba(255,255,255,0.45) 2px, transparent 2px, transparent 6px)',
                      }}
                    />
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-800 tabular-nums shrink-0 whitespace-nowrap">
                  {answer.percent > 0 && answer.percent < 1 ? '<1' : Math.round(answer.percent)}% ({answer.count})
                </div>
                <div className="w-5 shrink-0">{isYours && <YourPickIcon />}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
