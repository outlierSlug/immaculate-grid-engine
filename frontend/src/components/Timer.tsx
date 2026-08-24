import { useEffect, useState } from 'react';
import ClickTooltip from './ClickTooltip';

interface TimerProps {
  // Epoch ms when this attempt began. null means the puzzle hasn't loaded
  // yet, so there's nothing to display.
  startedAt: number | null;
  // Epoch ms when the game ended. null means still in progress (keeps
  // ticking); once set, elapsed time freezes at endedAt - startedAt forever
  // — including across a page refresh, since both are wall-clock instants,
  // not an accumulated counter that resets when the component remounts.
  endedAt: number | null;
  visible: boolean;
  // Distinguishes a true 9/9 solve from endedAt alone, which also gets set
  // on a give-up or out-of-guesses game-over - without this, the tooltip
  // would claim "time it took you to complete this puzzle" even when the
  // player never actually finished it.
  isComplete: boolean;
}

export default function Timer({ startedAt, endedAt, visible, isComplete }: TimerProps) {
  // Forces a re-render every second while running so the displayed
  // (endedAt ?? Date.now()) - startedAt keeps advancing; the tick counter's
  // value itself is never read.
  const [, setTick] = useState(0);

  useEffect(() => {
    if (startedAt == null || endedAt != null) return;
    const interval = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, [startedAt, endedAt]);

  if (!visible || startedAt == null) return null;

  const elapsedMs = Math.max(0, (endedAt ?? Date.now()) - startedAt);
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  const description = isComplete
    ? 'Time it took you to complete this puzzle.'
    : 'Time elapsed since you started this puzzle.';

  return (
    <ClickTooltip heading="Timer" description={description}>
      <div className="font-mono text-lg font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
        {minutes}:{seconds}
      </div>
    </ClickTooltip>
  );
}
