import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { isValidGameId } from '../config/games';
import { useEffect, useRef, useState } from 'react';
import SettingsModal from './SettingsModal';
import BrandMark from './BrandMark';
import ConfirmModal from './ConfirmModal';
import SignInModal from './SignInModal';
import { useAuth } from '../auth/AuthProvider';

export default function Header() {
  const { game } = useParams();
  const activeGame = isValidGameId(game) ? game : undefined;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isUnlimited = location.pathname.endsWith('/unlimited');
  const isArchive = location.pathname.includes('/archive');
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white/85 dark:bg-gray-900/85 backdrop-blur-sm">
        {/*
          grid-cols-[1fr_auto_1fr] (not grid-cols-3): the center column sizes
          to its own content and stays exactly centered via the two equal
          flanking columns, instead of being forced into a rigid equal third.
          That rigid-third layout is what clipped the brand text on narrow
          viewports previously - the outer columns can now shrink instead.
        */}
        <div className="max-w-4xl mx-auto px-4 py-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">

          {/* Column 1 (Left): Brand */}
          <div className="flex justify-start min-w-0">
            <Link
              to="/"
              className="flex items-center gap-2 min-w-0 hover:opacity-80 transition"
            >
              <BrandMark className="w-7 h-7 shrink-0" />
              <span className="hidden min-[420px]:inline font-bold text-lg tracking-tight truncate">
                GachaGrid
              </span>
            </Link>
          </div>

          {/* Column 2 (Center): Daily / Unlimited Toggle - icon + label pills,
              active one picked out with a tinted background rather than the
              previous grouped-pill-in-a-track look. */}
          <div className="flex justify-center">
            {activeGame && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => navigate(`/${activeGame}`)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
                    !isUnlimited && !isArchive
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/30 dark:text-indigo-200'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  <span className="hidden sm:inline">Daily</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/${activeGame}/unlimited`)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
                    isUnlimited
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/30 dark:text-indigo-200'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  <span className="hidden sm:inline">Unlimited</span>
                </button>
                {/* Archive is account-only - hidden rather than shown as a
                    dead-end that just bounces a logged-out click back here. */}
                {user && (
                  <button
                    type="button"
                    onClick={() => navigate(`/${activeGame}/archive`)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
                      isArchive
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/30 dark:text-indigo-200'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                    <span className="hidden sm:inline">Archive</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end items-center gap-1">
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((open) => !open)}
                  aria-label="Account"
                  className="block rounded-full ring-2 ring-transparent hover:ring-indigo-300 dark:hover:ring-indigo-500/50 transition cursor-pointer"
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/30 dark:text-indigo-200 font-semibold text-sm">
                      {user.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-44 rounded-lg shadow-lg bg-white dark:bg-gray-900 ring-1 ring-black/5 dark:ring-white/10 py-1 z-50">
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Profile
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setConfirmLogoutOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                      </svg>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSignInModalOpen(true)}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100 transition cursor-pointer"
              >
                Login
              </button>
            )}

            <div className="relative group">
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                aria-label="Settings"
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              {/* Icon-only button has no visible label otherwise - this
                  covers sighted mouse users the way aria-label already
                  covers screen readers. */}
              <span
                role="tooltip"
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 whitespace-nowrap rounded-md bg-gray-900 dark:bg-gray-700 px-2 py-1 text-xs font-medium text-white opacity-0 -translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0 transition duration-150"
              >
                Settings
              </span>
            </div>
          </div>
        </div>
      </header>

      {/*
        Rendered as a sibling of <header>, not a child - backdrop-blur on the
        header makes it the containing block for any fixed-position
        descendant, which squashed this modal's `fixed inset-0` into the
        header's own small box instead of the viewport.
      */}
      {settingsOpen && (
        <SettingsModal activeGame={activeGame} onClose={() => setSettingsOpen(false)} />
      )}

      {confirmLogoutOpen && (
        <ConfirmModal
          title="Log out?"
          message="You'll need to sign in again to access your Archive and stats."
          confirmLabel="Log out"
          onConfirm={() => {
            setConfirmLogoutOpen(false);
            logout();
            // Matches sign-in's own redirect-to-home behavior (AuthCallbackPage
            // navigates to "/" on success) - logging out from, say, /profile
            // or an Archive page would otherwise strand the visitor on a page
            // that may no longer make sense for a logged-out viewer.
            navigate('/');
          }}
          onCancel={() => setConfirmLogoutOpen(false)}
        />
      )}

      {signInModalOpen && <SignInModal onClose={() => setSignInModalOpen(false)} />}
    </>
  );
}