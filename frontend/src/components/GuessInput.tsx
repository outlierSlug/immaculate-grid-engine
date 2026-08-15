import { useEffect, useState } from 'react';
import { fetchItems } from '../api/client';
import type { GridItem } from '../types/puzzle';

interface GuessInputProps {
  game: string;
  rowLabel: string;
  colLabel: string;
  usedItemIds: Set<string>;
  onSelect: (item: GridItem) => void;
  onClose: () => void;
}

export default function GuessInput({
  game,
  rowLabel,
  colLabel,
  usedItemIds,
  onSelect,
  onClose,
}: GuessInputProps) {
  const [items, setItems] = useState<GridItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<GridItem | null>(null);

  useEffect(() => {
    fetchItems(game)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [game]);

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
        className="bg-white rounded-lg shadow-lg w-[calc(100vw-2rem)] max-w-96 max-h-[60vh] flex flex-col"
        onClick={(e) => {
          e.stopPropagation();
          handleModalClick();
        }}
      >
        {/* Selected cell categories */}
        <div className="relative px-4 pt-4 pb-2 border-b border-gray-100">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 cursor-pointer text-lg leading-none"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 text-sm font-semibold text-black mt-1 pr-6">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="uppercase tracking-wide">{rowLabel}</span>
          <span className="text-black">/</span>
          <span className="uppercase tracking-wide">{colLabel}</span>
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
                border border-gray-200
                outline-none
                focus:border-blue-500
                focus:ring-1 focus:ring-blue-200
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
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer text-sm leading-none"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Search results */}
        <div className="overflow-y-auto flex-1">
          {!loading &&
            query.trim().length > 0 &&
            filtered.length === 0 && (
              <div className="p-3 text-gray-500">
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
                  ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
                `}
              >
                <img
                  src={item.imageUrl}
                  alt={item.displayName}
                  className="w-10 h-10 rounded object-cover shrink-0"
                />

                <span className="font-medium flex-1 min-w-0">
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
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : isSelected
                        ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
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