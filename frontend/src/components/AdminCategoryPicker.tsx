import { useEffect, useState } from 'react';
import type { GameCategoriesResponse } from '../types/puzzle';

interface AdminCategoryPickerProps {
  categories: GameCategoriesResponse;
  onSelect: (categoryId: string) => void;
  onClose: () => void;
}

// Single-select variant of UnlimitedSettingsPanel's DimensionOverlay - that
// one toggles inclusion in a filter set (checkboxes, an "All" shortcut);
// this one picks exactly one exact category for a manual-build header slot,
// so a plain click-to-select-and-close list is the right interaction, not
// a filter form.
export default function AdminCategoryPicker({ categories, onSelect, onClose }: AdminCategoryPickerProps) {
  // Starts with every dimension expanded.
  const [expanded, setExpanded] = useState<Set<string>>(new Set(categories.dimensions.map((d) => d.dimension)));

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  function toggle(dimension: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(dimension)) next.delete(dimension);
      else next.add(dimension);
      return next;
    });
  }

  const allDimensions = categories.dimensions.map((d) => d.dimension);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-60" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-[calc(100vw-2rem)] max-w-80 max-h-[70vh] flex flex-col animate-[modal-in_0.15s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold">Choose a category</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-pointer text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center gap-3 px-4 pt-3 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setExpanded(new Set(allDimensions))}
            className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={() => setExpanded(new Set())}
            className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            Collapse all
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-1">
          {categories.dimensions.map((dim) => {
            const isOpen = expanded.has(dim.dimension);
            return (
              <div key={dim.dimension} className="border-b border-gray-100 dark:border-gray-800 last:border-0 py-2">
                <button
                  type="button"
                  onClick={() => toggle(dim.dimension)}
                  className="w-full flex items-center justify-between text-left cursor-pointer"
                >
                  <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {dim.dimension.replace(/_/g, ' ')}
                  </h4>
                  <svg
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {dim.categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => onSelect(cat.id)}
                        className="text-left px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-indigo-500/10 dark:hover:border-indigo-700 transition cursor-pointer"
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
