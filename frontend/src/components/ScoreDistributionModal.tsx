import { useEffect } from 'react';

interface ScoreDistributionModalProps {
  scoreDistribution: Record<string, number>;
  yourScore?: number | null;
  onClose: () => void;
}

const CHART_HEIGHT = 120;

export default function ScoreDistributionModal({ scoreDistribution, yourScore, onClose }: ScoreDistributionModalProps) {
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const scores = Object.keys(scoreDistribution)
    .map(Number)
    .sort((a, b) => a - b);
  const maxCount = Math.max(1, ...scores.map((s) => scoreDistribution[String(s)] ?? 0));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center pt-20 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-lg w-[calc(100vw-2rem)] max-w-104 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative px-4 pt-4 pb-3 border-b border-gray-100">
          <h2 className="font-bold text-center">Scores</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pt-6 pb-4">
          <div className="flex items-end justify-between gap-1.5" style={{ height: CHART_HEIGHT }}>
            {scores.map((score) => {
              const count = scoreDistribution[String(score)] ?? 0;
              const isYours = yourScore === score;
              const barHeight = count > 0 ? Math.max(3, (count / maxCount) * (CHART_HEIGHT - 18)) : 0;
              return (
                <div key={score} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                  <span className="text-[10px] text-gray-500 tabular-nums leading-none">{count}</span>
                  <div
                    className={`w-full max-w-5 rounded-t-sm ${isYours ? 'bg-blue-500' : 'bg-blue-300'}`}
                    style={{ height: barHeight }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between gap-1.5 mt-1.5 border-t border-gray-200 pt-1.5">
            {scores.map((score) => (
              <div key={score} className="flex-1 text-center text-xs font-semibold text-gray-600 tabular-nums">
                {score}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
