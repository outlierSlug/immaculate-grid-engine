import { useEffect, useMemo, useState } from 'react';
import { fetchItems } from '../api/client';
import type { GridItem } from '../types/puzzle';
import LoadingSpinner from './LoadingSpinner';
import ErrorState from './ErrorState';
import { formatCategoryLabel } from './CategoryChip';
import type { GameId } from '../config/games';

// Strips punctuation before matching so a name's stylized punctuation
// doesn't have to be typed exactly - "pekka" should find "P.E.K.K.A" (and
// "Mini P.E.K.K.A"), "mr p" should find "Mr. P", without needing the
// periods. Keeps spaces (so word boundaries still count) and digits.
//
// The collapse-whitespace pass after that is required, not cosmetic: a
// separator with spaces on BOTH sides ("Traveler – Aether", "Trailblazer
// – Stelle", "Dan Heng • Imbibitor Lunae") strips down to a DOUBLE space
// where the punctuation was (the dash/bullet itself vanishes, but the two
// spaces around it don't merge on their own) - so a natural single-spaced
// query like "traveler aether" would never match via plain .includes(),
// even though the name is right there. Collapsing runs of whitespace to
// one space fixes that without affecting "P.E.K.K.A" (no spaces around
// its periods to begin with, so nothing to collapse there).
function normalizeForSearch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

// Clash Royale's Evolution/Hero variants are officially named with a
// literal "Evo "/"Hero " prefix (e.g. "Evo Knight", "Hero Wizard") - and
// that prefix is also exactly a category value (the "form" dimension). A
// plain substring search means a short-enough query ("ev", "evo", "hero")
// matches every card in that category and NOTHING else, letting a player
// browse the whole category without knowing a single card in it.
//
// The check isn't just "do the matches all share a form" - a query like
// "evo w" (Evo Witch, Evo Wizard) also does that, but it's a completely
// ordinary narrowed search, not a leak: it's 2 cards out of 41
// Evolutions, not "the category." The real signal is whether the query
// reveals the ENTIRE category: does the match count equal that form's
// total count across the whole roster? Brute-forcing every 1-4 letter
// query against the full roster shows this is a clean, bimodal split
// with no fuzzy middle ground to tune a threshold for - the real leaks
// ("ev", "ero", "evo", "hero") sit at exactly 100% of their form's
// total, everything else (including "evo w" at 5%, "hero g" at 13%)
// isn't remotely close. Computed from the live roster (not hardcoded
// "Evolution"/"Hero" strings), so this stays correct if cards are
// added/renamed. A query narrowing to exactly one card is never blocked
// - one specific match is the point of searching, not a leak.
function isAmbiguousCategoryReveal(matches: GridItem[], formTotals: Map<unknown, number>): boolean {
  if (matches.length < 2) return false;
  const forms = new Set(matches.map((item) => item.attributes.form));
  const [onlyForm] = forms;
  if (forms.size !== 1 || onlyForm == null) return false;
  return matches.length === formTotals.get(onlyForm);
}

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

  // Total count of each `form` value across the whole roster - what
  // isAmbiguousCategoryReveal compares a match count against to tell "a
  // subset of this category" from "the whole category." Only meaningful
  // for Clash Royale; every other game's items have no `form` attribute
  // at all, so this stays empty and the check below is always a no-op
  // for them.
  const formTotals = useMemo(() => {
    const counts = new Map<unknown, number>();
    for (const item of items) {
      const value = item.attributes.form;
      if (value == null) continue;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  // A query that's all punctuation (e.g. "." or "/") normalizes to an
  // empty string - since "".includes("") style matching is always true,
  // that would otherwise match every item instead of none.
  const normalizedQuery = normalizeForSearch(query);
  const naiveMatches =
    query.trim().length > 0 && normalizedQuery.length > 0
      ? items.filter((item) => normalizeForSearch(item.displayName).includes(normalizedQuery))
      : [];
  const filtered = isAmbiguousCategoryReveal(naiveMatches, formTotals) ? [] : naiveMatches;

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