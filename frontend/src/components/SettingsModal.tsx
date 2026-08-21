import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { GAMES, type GameId } from '../config/games';
import { useTheme } from '../theme/ThemeProvider';
import { useRandomHeroImage } from '../hooks/useRandomHeroImage';

interface SettingsModalProps {
  activeGame?: GameId;
  onClose: () => void;
}

interface GameSwitchRowProps {
  game: (typeof GAMES)[GameId];
  isActive: boolean;
  onClick: () => void;
}

// Own component (not inlined in the .map() below) because it needs its own
// useRandomHeroImage call - hooks can't be called per-iteration inside a
// .map() callback, only inside a component instance.
function GameSwitchRow({ game, isActive, onClick }: GameSwitchRowProps) {
  const heroImage = useRandomHeroImage(game.id);
  // Same slow-connection gap as GameCard's hero art - see its comment.
  const [imageReady, setImageReady] = useState(false);

  return (
    <NavLink
      to={`/${game.id}`}
      onClick={onClick}
      className={`flex items-center gap-3 p-2 rounded-xl transition ${
        isActive
          ? `ring-2 ${game.selectedRingClass} bg-gray-50 dark:bg-gray-800/60`
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
      }`}
    >
      <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0">
        <div
          aria-hidden="true"
          className={`absolute inset-0 bg-gray-200 dark:bg-gray-700 ${imageReady ? '' : 'animate-pulse'}`}
        />
        <img
          src={heroImage.src}
          alt=""
          aria-hidden="true"
          onLoad={() => setImageReady(true)}
          onError={() => setImageReady(true)}
          className={`absolute inset-0 w-full h-full object-cover transition duration-300 ${
            imageReady ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ objectPosition: heroImage.objectPosition }}
        />
      </div>
      <span className="flex items-center gap-1.5 font-semibold text-sm flex-1 min-w-0">
        <span className={`w-2 h-2 rounded-full shrink-0 ${game.dotClass}`} aria-hidden="true" />
        <span className="truncate">{game.label}</span>
      </span>
      {isActive && (
        <svg
          className="w-5 h-5 shrink-0 text-gray-500 dark:text-gray-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      )}
    </NavLink>
  );
}

export default function SettingsModal({ activeGame, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-[2px] flex items-start justify-center pt-24 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl ring-1 ring-black/5 dark:ring-white/10 w-[calc(100vw-2rem)] max-w-96 max-h-[80vh] flex flex-col animate-[modal-in_0.15s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative px-5 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-lg tracking-tight">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-pointer text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-6">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
              Game
            </h3>
            <div className="flex flex-col gap-1.5">
              {Object.values(GAMES).map((g) => (
                <GameSwitchRow key={g.id} game={g} isActive={activeGame === g.id} onClick={onClose} />
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
              Appearance
            </h3>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg text-sm font-semibold">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                  theme === 'light'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
                Light
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
                Dark
              </button>
            </div>
          </section>

          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 [&::-webkit-details-marker]:hidden marker:hidden">
              How to Play
              <svg
                className="w-3.5 h-3.5 shrink-0 transition-transform group-open:rotate-180"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </summary>
            <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside marker:text-gray-300 dark:marker:text-gray-600">
              <li>Each puzzle is a 3&times;3 grid. Click a cell, then guess something that satisfies <b>both its row and column conditions</b>.</li>
              <li>A character may only be used <b>once</b> per board.</li>
              <li>Daily gives you one puzzle a day and <b>9</b> guesses. </li>
              <li>Unlimited lets you generate as many puzzles as you like, with adjustable rules.</li>
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
}
