import { Link, useNavigate, useParams } from 'react-router-dom';
import { GAMES, isValidGameId } from '../config/games';
import { useState } from 'react';
import SettingsModal from './SettingsModal';

export default function Header() {
  const { game } = useParams();
  const activeGame = isValidGameId(game) ? game : undefined;
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="border-b border-gray-200 bg-white">
      {/* 
        Using grid grid-cols-3 guarantees 3 equal columns:
        - Column 1: Left-aligned
        - Column 2: Centered
        - Column 3: Right-aligned
      */}
      <div className="max-w-4xl mx-auto px-4 py-3 grid grid-cols-3 items-center">
        
        {/* Column 1 (Left): Brand Logo */}
        <div className="flex justify-start">
          <Link to="/" className="font-bold text-lg tracking-tight hover:opacity-80 transition whitespace-nowrap">
            Immaculate Grid
          </Link>
        </div>

        {/* Column 2 (Center): Daily / Unlimited Toggle */}
        <div className="flex justify-center">
          {activeGame && (
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-full text-xs font-semibold">
              <button 
                className="px-3 py-1 rounded-full bg-white text-gray-900 shadow-sm transition"
              >
                Daily
              </button>
              <button 
                disabled 
                className="px-3 py-1 rounded-full text-gray-400 cursor-not-allowed hover:text-gray-400" 
                title="Coming soon"
              >
                Unlimited
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {settingsOpen && (
        <SettingsModal activeGame={activeGame} onClose={() => setSettingsOpen(false)} />
      )}
    </header>
  );
}