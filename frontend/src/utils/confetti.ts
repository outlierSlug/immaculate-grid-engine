import confetti from 'canvas-confetti';

// Fired once when a puzzle is fully solved (9/9) - see usePuzzleGuesses's
// game-over effect, which already guards this to fire exactly once per
// completion (not on every revisit of an already-solved puzzle). Skips
// entirely under prefers-reduced-motion, matching every other animation
// in this app (the motion-safe: Tailwind variant used throughout).
export function celebrateSolve() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const shared = { startVelocity: 35, spread: 70, ticks: 100, zIndex: 100 };

  confetti({ ...shared, particleCount: 60, angle: 60, origin: { x: 0, y: 0.7 } });
  confetti({ ...shared, particleCount: 60, angle: 120, origin: { x: 1, y: 0.7 } });
}
