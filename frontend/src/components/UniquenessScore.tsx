import { useEffect, useRef, useState } from 'react';

interface UniquenessScoreProps {
  // Live — recomputed on every render from currently-filled cells and the
  // latest community data, not frozen until the game genuinely ends.
  score: number;
  // null when there's no one else finished to compare against yet - either
  // nobody has finished at all, or (once youFinished) you're the only one
  // so far. youFinished disambiguates which of those two null-percentile
  // cases this is, since they read very differently to the player.
  percentile: number | null;
  youFinished: boolean;
}

// Occupies the slot Timer used to hold in Daily mode - deliberately not a
// modal, just a small dismissible tooltip, per the "click for a tooltip"
// request (not "open a modal").
export default function UniquenessScore({ score, percentile, youFinished }: UniquenessScoreProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const message =
    percentile == null
      ? youFinished
        ? "You're the first completion today!"
        : "No one has finished today's puzzle yet. Check back soon for a comparison."
      : `You scored a uniqueness of ${score}, which is better than ${percentile.toFixed(1)}% of players today.`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Uniqueness Score"
        className="font-mono text-lg font-semibold text-gray-700 dark:text-gray-300 tabular-nums cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
      >
        UNIQ {score}
      </button>
      {open && (
        <div className="absolute z-40 top-full mt-2 left-1/2 -translate-x-1/2 w-56 bg-white dark:bg-gray-800 text-black dark:text-gray-100 text-xs rounded-lg shadow-lg px-3 py-2 text-center">
          {message}
        </div>
      )}
    </div>
  );
}
