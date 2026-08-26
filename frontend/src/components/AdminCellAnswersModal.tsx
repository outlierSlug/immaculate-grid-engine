import { useEffect } from 'react';
import type { GridItem } from '../types/puzzle';

interface AdminCellAnswersModalProps {
  rowLabel: string;
  colLabel: string;
  answers: GridItem[];
  onClose: () => void;
  avatarShapeClass: string;
  avatarAspectClass: string;
  avatarBorderClass: string;
}

// Same shell as CommunityAnswersModal, but a plain list of valid answers -
// no percentage bars, no "yours" marker. There's no real pick distribution
// here (nobody has played this puzzle yet), only ground truth: these are
// the itemIds cellSolutions already lists for this cell.
export default function AdminCellAnswersModal({
  rowLabel,
  colLabel,
  answers,
  onClose,
  avatarShapeClass,
  avatarAspectClass,
  avatarBorderClass,
}: AdminCellAnswersModalProps) {
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center pt-16 z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-[calc(100vw-2rem)] max-w-108 max-h-[70vh] flex flex-col animate-[modal-in_0.15s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-center">Valid Answers</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-pointer text-lg leading-none"
          >
            ✕
          </button>
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 mt-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="uppercase tracking-wide">{rowLabel}</span>
            <span>/</span>
            <span className="uppercase tracking-wide">{colLabel}</span>
          </div>
          <div className="flex justify-center mt-2">
            <span className="inline-flex px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
              {answers.length} valid {answers.length === 1 ? 'answer' : 'answers'}
            </span>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-2">
          {answers.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg">
              <img
                src={item.imageUrl}
                alt={item.displayName}
                className={`h-9 ${avatarAspectClass} ${avatarShapeClass} object-cover ${avatarBorderClass} shrink-0`}
              />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{item.displayName}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
