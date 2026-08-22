import { useEffect, type ReactNode } from 'react';

interface HelpModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

// Generic "info" overlay for a page's own help content - unlike ConfirmModal
// this has no action to confirm, just a title, body content, and a close
// button. Body content (children) lives at each call site, right next to
// the page it explains, rather than in a shared copy file - matches how
// LegalPage's own text is inline rather than externalized.
export default function HelpModal({ title, onClose, children }: HelpModalProps) {
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
        <div className="flex flex-col gap-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}
