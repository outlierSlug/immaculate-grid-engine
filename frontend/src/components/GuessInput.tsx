import { useEffect, useState } from 'react';
import { fetchItems } from '../api/client';
import type { GridItem } from '../types/puzzle';
import LoadingSpinner from './LoadingSpinner';
import ErrorState from './ErrorState';
import { formatCategoryLabel } from './CategoryChip';
import type { GameId } from '../config/games';

interface GuessInputProps {
  game: GameId;
  rowLabel: string;
  colLabel: string;
  usedItemIds: Set<string>;
  onSelect: (item: GridItem) => void;
  onClose: () => void;
  avatarShapeClass: string;
  avatarAspectClass: string;
}

export default function GuessInput({
  game,
  rowLabel,
  colLabel,
  usedItemIds,
  onSelect,
  onClose,
  avatarShapeClass,
  avatarAspectClass,
}: GuessInputProps) {
  const [items, setItems] = useState<GridItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedItem, setSelectedItem] = useState<GridItem | null>(null);

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    fetchItems(game)
      .then(setItems)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [game, retryCount]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const filtered =
    query.trim().length > 0
      ? items.filter((item) =>
          item.displayName.toLowerCase().includes(query.toLowerCase())
        )
      : [];

  function handleSelectClick(item: GridItem) {
    // Characters cannot be used more than once
    if (usedItemIds.has(item.id)) return;
    if (selectedItem?.id === item.id) {
      // Second consecutive click on the same button confirms.
      onSelect(item);
    } else {
      // First click arms the item for confirmation.
      setSelectedItem(item);
    }
  }

  function handleModalClick() {
    // Any click inside the modal that isn't the exact same
    // confirmation button cancels the pending confirmation.
    if (selectedItem) {
      setSelectedItem(null);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-start justify-center pt-24 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-[calc(100vw-2rem)] max-w-96 max-h-[60vh] flex flex-col animate-[modal-in_0.15s_ease-out]"
        onClick={(e) => {
          e.stopPropagation();
          handleModalClick();
        }}
      >
        {/* Selected cell categories */}
        <div className="relative px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-pointer text-lg leading-none"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 text-sm font-semibold text-black dark:text-gray-100 mt-1 pr-6">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="uppercase tracking-wide">{formatCategoryLabel(rowLabel, game)}</span>
          <span className="text-black dark:text-gray-100">/</span>
          <span className="uppercase tracking-wide">{formatCategoryLabel(colLabel, game)}</span>
        </div>
      </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedItem(null);
              }}
              placeholder="Search for a character..."
              className="
                w-full
                p-2 pr-8
                border border-gray-200 dark:border-gray-700
                bg-white dark:bg-gray-900
                text-black dark:text-gray-100
                placeholder:text-gray-400 dark:placeholder:text-gray-500
                focus:border-indigo-500 focus-ring-none
                rounded-md
                transition
              "
            />

            {query.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSelectedItem(null);
                }}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-pointer text-sm leading-none"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Search results */}
        <div className="overflow-y-auto flex-1">
          {/* Only shown once the user has actually typed something while the
              roster is still loading - on a normal fast connection that
              window is sub-frame, so showing this unconditionally on open
              just meant the modal's size visibly jumped on every open
              (loading -> empty) for no benefit. An empty query already
              renders nothing below, so staying silent here keeps that
              resting state stable. */}
          {loading && query.trim().length > 0 && (
            <LoadingSpinner label={`Searching for "${query.trim()}"...`} size="sm" className="py-6" />
          )}

          {!loading && loadError && (
            <ErrorState
              message="Couldn't load the character list."
              onRetry={() => setRetryCount((n) => n + 1)}
              className="py-6"
            />
          )}

          {!loading &&
            !loadError &&
            query.trim().length > 0 &&
            filtered.length === 0 && (
              <div className="p-3 text-gray-500 dark:text-gray-400">
                No matches
              </div>
            )}

          {filtered.map((item) => {
            const isSelected = selectedItem?.id === item.id;
            const isUsed = usedItemIds.has(item.id);

            return (
              <div
                key={item.id}
                className={`
                  w-full
                  flex items-center gap-3
                  px-3 py-2
                  transition
                  ${isSelected ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}
                `}
              >
                <img
                  src={item.imageUrl}
                  alt={item.displayName}
                  className={`h-10 ${avatarAspectClass} ${avatarShapeClass} object-cover shrink-0`}
                />

                <span className="font-medium flex-1 min-w-0 text-black dark:text-gray-100">
                  {item.displayName}
                </span>

                <button
                  type="button"
                  disabled={isUsed}
                  onClick={(e) => {
                    e.stopPropagation();

                    // If this is the same item, confirm.
                    // Otherwise, arm this item.
                    handleSelectClick(item);
                  }}
                  className={`
                    w-20
                    px-3 py-1.5
                    rounded-md
                    text-sm font-semibold
                    transition
                    ${
                      isUsed
                        ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed'
                        : isSelected
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 cursor-pointer'
                    }
                  `}
                >
                  {isSelected ? 'Confirm' : 'Select'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}