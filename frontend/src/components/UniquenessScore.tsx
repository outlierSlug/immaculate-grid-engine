import { useEffect, useRef, useState } from 'react';

interface UniquenessScoreProps {
  // Live — recomputed on every render from currently-filled cells and the
  // latest community data, not frozen until the game genuinely ends.
  score: number;
  // null when nobody has finished this puzzle yet (nothing to compare to).
  percentile: number | null;
}

// Occupies the slot Timer used to hold in Daily mode - deliberately not a
// modal, just a small dismissible tooltip, per the "click for a tooltip"
// request (not "open a modal").
export default function UniquenessScore({ score, percentile }: UniquenessScoreProps) {
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
      ? "No one has finished today's puzzle yet. Check back soon for a comparison."
      : `You scored a uniqueness of ${score}, which is better than ${percentile.toFixed(1)}% of players today.`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Uniqueness Score"
        className="font-mono text-lg font-semibold text-gray-700 tabular-nums cursor-pointer hover:text-gray-900"
      >
        UNIQ {score}
      </button>
      {open && (
        <div className="absolute z-40 top-full mt-2 left-1/2 -translate-x-1/2 w-56 bg-white text-black text-xs rounded-lg shadow-lg px-3 py-2 text-center">
          {message}
        </div>
      )}
    </div>
  );
}
