import { useEffect, useRef, useState } from 'react';
import { shortDateLabel, nextPacificMidnight } from '../utils/dateIso';
import { BOARD_WIDTH_CSS } from '../utils/gridSizing';

interface ShareResultRowProps {
  puzzleDate: string;
  gameId: string;
  gameLabel: string;
  // "row-col" keys this player answered correctly - drives the emoji
  // grid's per-cell pattern in the share text/popover preview, and its
  // size doubles as the score (only correct guesses ever land here).
  correctCellKeys: Set<string>;
  rowCount: number;
  colCount: number;
}

// Always the real production domain, never the request's own origin - the
// whole point of a shared link is that it works for whoever receives it,
// not just this tab (which could be localhost, a preview deploy, etc.).
const SITE_ORIGIN = 'gachagrid.com';

// Ticks a live "HH:MM:SS" countdown to the next Daily reset. Recomputed
// only when puzzleDate changes (not every render) - nextPacificMidnight()
// returns a fresh Date identity each call, so calling it directly in the
// render body would re-trigger this effect (and restart the interval)
// every single render if it were a dependency instead of the stable
// puzzleDate string.
function useResetCountdown(puzzleDate: string): string {
  const [label, setLabel] = useState('--:--:--');

  useEffect(() => {
    const target = nextPacificMidnight();
    function tick() {
      const diffMs = Math.max(0, target.getTime() - Date.now());
      const h = String(Math.floor(diffMs / 3_600_000)).padStart(2, '0');
      const m = String(Math.floor((diffMs % 3_600_000) / 60_000)).padStart(2, '0');
      const s = String(Math.floor((diffMs % 60_000) / 1_000)).padStart(2, '0');
      setLabel(`${h}:${m}:${s}`);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [puzzleDate]);

  return label;
}

// Spoiler-free result row shown once a puzzle is done (Daily game-over or a
// remote-completion view) - sits between the grid and PuzzleStatsPanel's
// own "Puzzle Stats" section. Just the reset countdown and a Share button -
// score/UNIQ are already shown right above in PuzzleGrid's own side column,
// so repeating them here would be redundant.
export default function ShareResultRow({
  puzzleDate,
  gameId,
  gameLabel,
  correctCellKeys,
  rowCount,
  colCount,
}: ShareResultRowProps) {
  const countdown = useResetCountdown(puzzleDate);
  const score = correctCellKeys.size;
  const totalCells = rowCount * colCount;
  const shareUrl = `${SITE_ORIGIN}/${gameId}`;

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!popoverOpen) return;
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setPopoverOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setPopoverOpen(false);
    }
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [popoverOpen]);

  function buildShareText(): string {
    const lines: string[] = [];
    for (let r = 0; r < rowCount; r++) {
      let line = '';
      for (let c = 0; c < colCount; c++) {
        line += correctCellKeys.has(`${r}-${c}`) ? '🟩' : '⬛';
      }
      lines.push(line);
    }
    return [
      `I scored ${score}/${totalCells} on GachaGrid - ${gameLabel} (${shortDateLabel(puzzleDate)})!`,
      '',
      ...lines,
      '',
      shareUrl,
    ].join('\n');
  }

  async function handleShare() {
    const text = buildShareText();

    // Native share sheet where available (most phones) - no popover needed,
    // the OS handles the whole flow. Falls through to the clipboard+popover
    // path below on desktop browsers, or if the user cancels/it fails.
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // Cancelled or failed - fall through to the clipboard path rather
        // than leaving the click with no visible result.
      }
    }

    setCopied(false);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard access can be denied/unavailable - the popover still
      // shows the preview below so the player can select and copy it by
      // hand, just without the "Copied!" confirmation.
    }
    setPopoverOpen(true);
  }

  return (
    <div
      style={{ width: BOARD_WIDTH_CSS }}
      className="relative flex items-center justify-center gap-3 bg-white dark:bg-gray-900 rounded-full shadow-sm px-4 py-2.5"
    >
      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
        Resets in <span className="font-mono font-semibold tabular-nums text-gray-900 dark:text-gray-100">{countdown}</span>
      </span>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleShare}
        aria-label="Share result"
        className="grid place-items-center w-9 h-9 shrink-0 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.6" y1="10.6" x2="15.4" y2="6.4" />
          <line x1="8.6" y1="13.4" x2="15.4" y2="17.6" />
        </svg>
      </button>

      {popoverOpen && (
        <div
          ref={popoverRef}
          className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 z-20"
        >
          <div className="bg-gray-100 dark:bg-gray-900 rounded-lg px-3 py-2 text-center">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 leading-snug mb-2">
              I scored {score}/{totalCells} on GachaGrid - {gameLabel} ({shortDateLabel(puzzleDate)})!
            </p>
            <div className="text-lg leading-snug">
              {Array.from({ length: rowCount }, (_, r) => (
                <div key={r}>
                  {Array.from({ length: colCount }, (_, c) => (correctCellKeys.has(`${r}-${c}`) ? '🟩' : '⬛')).join('')}
                </div>
              ))}
            </div>
            <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mt-2">{shareUrl}</p>
          </div>
          {copied && (
            <p className="text-xs font-semibold text-green-600 dark:text-green-400 text-center mt-2">Copied to clipboard!</p>
          )}
        </div>
      )}
    </div>
  );
}
