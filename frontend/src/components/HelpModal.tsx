import { useEffect, useState, type ReactNode } from 'react';
import { CHANGELOG, type ChangelogEntry } from '../data/changelog';
import { shortDateLabel } from '../utils/dateIso';

// Splits entry.text around entry.link.text (an exact substring - see
// ChangelogEntry's own doc comment) and renders that piece as a link,
// rather than pulling in real markdown parsing for what's normally just
// plain text.
function renderChangelogText(entry: ChangelogEntry): ReactNode {
  if (!entry.link) return entry.text;
  const index = entry.text.indexOf(entry.link.text);
  if (index === -1) return entry.text;
  const before = entry.text.slice(0, index);
  const after = entry.text.slice(index + entry.link.text.length);
  return (
    <>
      {before}
      <a
        href={entry.link.url}
        target="_blank"
        rel="noreferrer"
        className="text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        {entry.link.text}
      </a>
      {after}
    </>
  );
}

interface HelpModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

// Generic "info" overlay for a page's own help content - unlike ConfirmModal
// this has no action to confirm, just a title, body content, and a close
// button. Body content (children) lives at each call site, right next to
// the page it explains, rather than in a shared copy file - matches how
// LegalPage's own text is inline rather than externalized. The "What's
// New" tab is the one exception: it's the same site-wide CHANGELOG
// everywhere this modal is used, not a per-call-site prop, since a launch
// date or a Clash Royale data fix isn't specific to whichever page you
// happened to open help from.
export default function HelpModal({ title, onClose, children }: HelpModalProps) {
  const [tab, setTab] = useState<'info' | 'changelog'>('info');

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-lg w-full max-w-sm p-5 animate-[modal-in_0.15s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="font-bold text-lg">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 -mr-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex gap-4 mb-3 border-b border-gray-100 dark:border-gray-800">
          {(['info', 'changelog'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`
                pb-2 text-sm font-semibold border-b-2 -mb-px transition cursor-pointer
                ${
                  tab === t
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                }
              `}
            >
              {t === 'info' ? 'Info' : "Changelog"}
            </button>
          ))}
        </div>

        {tab === 'info' ? (
          <div className="flex flex-col gap-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {children}
          </div>
        ) : (
          <div className="flex flex-col gap-3 text-sm max-h-72 overflow-y-auto">
            {CHANGELOG.map((entry) => (
              <div key={entry.date + entry.text} className="flex gap-3">
                <span className="shrink-0 w-14 text-xs font-semibold text-gray-400 dark:text-gray-500 pt-px">
                  {shortDateLabel(entry.date)}
                </span>
                <span className="text-gray-600 dark:text-gray-400 leading-relaxed">{renderChangelogText(entry)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
