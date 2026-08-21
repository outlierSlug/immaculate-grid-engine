import { useEffect } from 'react';

interface UniquenessModalProps {
  // Every finished attempt's live uniqueness score, raw and unordered.
  uniquenessScores: number[];
  yourScore: number;
  mostUniqueScore: number | null;
  onClose: () => void;
}

// Uniqueness scores span 0-900, too wide a range for a per-value bar like
// ScoreDistributionModal's 0-9 — bucketed into 100-wide intervals instead.
const BUCKET_SIZE = 100;
const BUCKET_COUNT = 9; // 0-100, 100-200, ..., 800-900
const CHART_HEIGHT = 120;

function bucketIndex(score: number): number {
  return Math.min(BUCKET_COUNT - 1, Math.max(0, Math.floor(score / BUCKET_SIZE)));
}

function bucketLabel(index: number): string {
  const start = index * BUCKET_SIZE;
  const end = index === BUCKET_COUNT - 1 ? 900 : start + BUCKET_SIZE;
  return `${start}-${end}`;
}

export default function UniquenessModal({ uniquenessScores, yourScore, mostUniqueScore, onClose }: UniquenessModalProps) {
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const counts = Array.from({ length: BUCKET_COUNT }, () => 0);
  uniquenessScores.forEach((score) => {
    counts[bucketIndex(score)] += 1;
  });
  const maxCount = Math.max(1, ...counts);
  const yourBucket = bucketIndex(yourScore);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center pt-16 z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-[calc(100vw-2rem)] max-w-lg flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-center">Uniqueness Score</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-pointer text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="px-6 pt-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Every grid starts at a uniqueness score of 900. Each correct pick lowers it. The rarer your pick
            was among everyone who played today, the bigger the drop. A lower score means a more unique grid
            overall.
          </p>
        </div>

        <div className="px-6 pt-4 flex justify-center gap-8 text-center">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Your score</div>
            <div className="text-lg font-bold tabular-nums">{yourScore}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Most unique today</div>
            <div className="text-lg font-bold tabular-nums">{mostUniqueScore ?? '—'}</div>
          </div>
        </div>

        <div className="px-6 pt-5 pb-5">
          <div className="flex items-end justify-between gap-1" style={{ height: CHART_HEIGHT }}>
            {counts.map((count, i) => {
              const isYours = i === yourBucket;
              const barHeight = count > 0 ? Math.max(3, (count / maxCount) * (CHART_HEIGHT - 18)) : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 tabular-nums leading-none">{count}</span>
                  <div
                    className={`w-full max-w-6 rounded-t-sm ${isYours ? 'bg-blue-500' : 'bg-blue-300 dark:bg-blue-500/30'}`}
                    style={{ height: barHeight }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between gap-1 mt-1.5 border-t border-gray-200 dark:border-gray-800 pt-1.5">
            {counts.map((_, i) => (
              <div key={i} className="flex-1 text-center text-[9px] font-semibold text-gray-500 dark:text-gray-400 tabular-nums">
                {bucketLabel(i)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
