import { useLayoutEffect, useState } from 'react';

interface ScoreProps {
  correct: number;
  total: number;
  // Same guess-result signal that drives PuzzleGrid's cell border flash.
  // Pops only when the guess was correct — score doesn't change on a
  // wrong guess, so popping it then would be misleading.
  feedback?: { row: number; col: number; correct: boolean } | null;
}

export default function Score({ correct, total, feedback }: ScoreProps) {
  // See GuessCounter for why this is a remount-key-driven keyframe
  // animation (not a held transition) on useLayoutEffect (not useEffect) —
  // avoids a visible plateau at the peak, and keeps this starting in the
  // same paint as PuzzleGrid's border flash.
  const [popKey, setPopKey] = useState(0);
  useLayoutEffect(() => {
    if (feedback?.correct !== true) return;
    setPopKey((k) => k + 1);
  }, [feedback]);

  return (
    <div title="Score" className="text-gray-700">
      <div
        key={popKey}
        className={`font-mono text-lg font-semibold tabular-nums ${
          popKey > 0 ? 'animate-[pop_700ms_ease-in-out]' : ''
        }`}
      >
        {correct}/{total}
      </div>
    </div>
  );
}
