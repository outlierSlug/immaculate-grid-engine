import { useEffect } from 'react';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Generic yes/no guard for actions that shouldn't fire on a stray click
// (e.g. Give Up) — not tied to any one page, so it can cover other
// destructive-ish confirmations later without a new component.
export default function ConfirmModal({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-lg w-[calc(100vw-2rem)] max-w-80 p-5 animate-[modal-in_0.15s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-lg text-center">{title}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-2">{message}</p>
        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-full bg-red-600 text-white font-semibold hover:bg-red-700 transition cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
