import { useEffect, useState } from 'react';

interface TimerProps {
  // Changing this value restarts the timer from zero (e.g. a new puzzle id).
  startKey: string;
  // Controls only the rendered output — the underlying clock keeps running
  // even while hidden, so toggling this back on shows the true elapsed time.
  visible: boolean;
  // Set false to freeze the displayed time (e.g. once the puzzle is solved).
  running: boolean;
}

export default function Timer({ startKey, visible, running }: TimerProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    setElapsedMs(0);
  }, [startKey]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setElapsedMs((prev) => prev + 1000), 1000);
    return () => clearInterval(interval);
  }, [running, startKey]);

  if (!visible) return null;

  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  return (
    <div className="font-mono text-lg font-semibold text-gray-700 tabular-nums">
      {minutes}:{seconds}
    </div>
  );
}
