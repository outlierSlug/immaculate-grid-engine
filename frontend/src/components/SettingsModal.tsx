import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { GAMES, type GameId } from '../config/games';

interface SettingsModalProps {
  activeGame?: GameId;
  onClose: () => void;
}

export default function SettingsModal({ activeGame, onClose }: SettingsModalProps) {
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-start justify-center pt-24 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg w-[calc(100vw-2rem)] max-w-96 max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative px-4 pt-4 pb-3 border-b border-gray-100">
          <h2 className="font-bold text-lg">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Game
            </h3>
            <div className="flex flex-col gap-1">
              {Object.values(GAMES).map((g) => (
                <NavLink
                  key={g.id}
                  to={`/${g.id}`}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition ${
                    activeGame === g.id
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {g.label}
                  {activeGame === g.id && <span aria-hidden="true">✓</span>}
                </NavLink>
              ))}
            </div>
          </section>

          {/* Placeholder for future settings — category display style
              (icon / mixed / text), per-game options, etc. */}
          <section className="mt-6 opacity-40 pointer-events-none">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Display (coming soon)
            </h3>
            <p className="text-sm text-gray-400">
              Category icon style, per-game display options.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}