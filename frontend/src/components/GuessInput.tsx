import { useEffect, useState } from 'react';
import { fetchItems } from '../api/client';
import type { GridItem } from '../types/puzzle';

interface GuessInputProps {
  onSelect: (item: GridItem) => void;
  onClose: () => void;
}

export default function GuessInput({ onSelect, onClose }: GuessInputProps) {
  const [items, setItems] = useState<GridItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((item) =>
    item.displayName.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-start justify-center pt-24 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg w-96 max-h-[60vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a character..."
          className="p-3 border-b border-gray-200 outline-none rounded-t-lg"
        />

        <div className="overflow-y-auto flex-1">
          {loading && <div className="p-3 text-gray-500">Loading...</div>}

          {!loading && filtered.length === 0 && (
            <div className="p-3 text-gray-500">No matches</div>
          )}

          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 text-left"
            >
              <img src={item.imageUrl} alt={item.displayName} className="w-10 h-10 rounded object-cover" />
              <span className="font-medium">{item.displayName}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}