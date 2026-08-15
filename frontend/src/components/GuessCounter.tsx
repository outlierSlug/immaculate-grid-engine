import { useLayoutEffect, useState } from 'react';

interface GuessCounterProps {
  // null means unlimited — shows an infinity symbol that never changes.
  remaining: number | null;
  // Themed icon (e.g. a game's wish/currency art) shown next to the count.
  // Falls back to a generic gem shape when a game has no themed asset yet.
  iconSrc?: string;
  // Same guess-result signal that drives PuzzleGrid's cell border flash.
  // Pops on every guess (right or wrong) since an attempt is consumed
  // either way — even while showing the infinity symbol.
  feedback?: { row: number; col: number; correct: boolean } | null;
}

export default function GuessCounter({ remaining, iconSrc, feedback }: GuessCounterProps) {
  const unlimited = remaining === null;
  const depleted = remaining === 0;
  const title = unlimited
    ? 'Unlimited guesses remaining'
    : `${remaining} guess${remaining === 1 ? '' : 'es'} remaining`;

  // Bumped on every new guess result — changing `key` below remounts the
  // inner element so the `pop` keyframe animation always replays from the
  // start, even for back-to-back guesses. A plain transition toggled by a
  // held boolean (the earlier approach) visibly paused at the peak scale
  // for however long the hold lasted; a one-shot keyframe animation moves
  // continuously from 1 -> 1.5 -> 1 with no plateau. useLayoutEffect (not
  // useEffect) so this commits in the same paint as PuzzleGrid's border
  // flash — both react to the same `feedback` value, so they need to start
  // in the same frame to read as one moment rather than one trailing the
  // other by a tick.
  const [popKey, setPopKey] = useState(0);
  useLayoutEffect(() => {
    if (!feedback) return;
    setPopKey((k) => k + 1);
  }, [feedback]);

  return (
    <div title={title} className={depleted ? 'text-gray-500' : 'text-black'}>
      <div
        key={popKey}
        className={`flex items-center gap-1.5 font-mono text-lg font-semibold tabular-nums ${
          popKey > 0 ? 'animate-[pop_700ms_ease-in-out]' : ''
        }`}
      >
        {iconSrc ? (
          <img
            src={iconSrc}
            alt=""
            aria-hidden="true"
            className="w-6 h-6 shrink-0 object-contain"
          />
        ) : (
          <svg
            viewBox="0 0 24 24"
            className={`w-4 h-4 shrink-0 ${depleted ? 'text-gray-300' : 'text-red-500'}`}
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2 L20 12 L12 22 L4 12 Z" />
          </svg>
        )}
        {unlimited ? (
          <svg viewBox="0 0 512 512" className="w-6 h-6 shrink-0" fill="currentColor" aria-hidden="true">
            <path d="M434.7 188c-18.8-18-43.8-28-70.5-28-26.6 0-51.6 9.9-70.4 27.9l-17.6 15.9 33.1 32.1 17-15.4.1-.1c10.1-9.6 23.5-15 37.7-15 14.2 0 27.6 5.3 37.7 14.9 10 9.6 15.4 22.3 15.4 35.8 0 13.5-5.5 26.1-15.4 35.6-10.1 9.6-23.5 15-37.7 15s-27.6-5.3-37.7-14.9L218.2 188c-18.9-18-43.9-28-70.4-28-26.7 0-51.7 9.9-70.5 28C58.4 206.1 48 230.2 48 256c0 25.7 10.4 49.9 29.3 68 18.8 18 43.8 28 70.5 28 26.7 0 51.7-9.9 70.4-28l37.8-36.1 37.7 36.1c18.9 18 43.9 28 70.4 28 26.7 0 51.7-9.9 70.4-27.9 19-18.1 29.4-42.2 29.4-68 .1-25.8-10.3-50-29.2-68.1zM185.5 291.7c-10.1 9.6-23.5 15-37.7 15-14.2 0-27.6-5.3-37.7-14.9-10-9.6-15.4-22.3-15.4-35.8 0-13.5 5.5-26.1 15.4-35.6 10.1-9.6 23.5-15 37.7-15 14.2 0 27.6 5.3 37.7 14.9l37.4 35.8-37.4 35.6z" />
          </svg>
        ) : (
          <span>{remaining}</span>
        )}
      </div>
    </div>
  );
}
