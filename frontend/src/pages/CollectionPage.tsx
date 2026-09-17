import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { fetchCollection, fetchItems } from '../api/client';
import { GAMES, isValidGameId, type GameId } from '../config/games';
import { COLLECTION_COPIES, COLLECTION_COPY_ITEMS, COLLECTION_TEXT, copiesLevel } from '../config/collection';
import { longDateLabel } from '../utils/dateIso';
import { categoryIcon } from '../components/CategoryChip';
import type { CollectionEntry, GridItem } from '../types/puzzle';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import HelpButton from '../components/HelpButton';
import HelpModal from '../components/HelpModal';
import NotFoundPage from './NotFoundPage';

// Highest rarity first - the tile grid's sort order.
const RARITY_ORDER: Record<GameId, string[]> = {
  genshin: ['5', '4'],
  starrail: ['5', '4'],
  brawlstars: ['Ultra Legendary', 'Legendary', 'Mythic', 'Epic', 'Super Rare', 'Rare', 'Common'],
  clashroyale: ['Champion', 'Legendary', 'Epic', 'Rare', 'Common'],
};

// Tile background per rarity, modeled on each game's own roster screens
// (Genshin's gold/purple character cards, Brawl Stars/Clash Royale's rarity
// colors). Literal class strings so Tailwind's scanner picks them up.
const RARITY_TILE_CLASS: Record<GameId, Record<string, string>> = {
  genshin: {
    '5': 'bg-linear-to-b from-[#8c5d3b] to-[#c1874d]',
    '4': 'bg-linear-to-b from-[#5d4f8c] to-[#9678c0]',
  },
  starrail: {
    '5': 'bg-linear-to-b from-[#8c5d3b] to-[#c1874d]',
    '4': 'bg-linear-to-b from-[#5d4f8c] to-[#9678c0]',
  },
  brawlstars: {
    'Ultra Legendary': 'bg-linear-to-br from-pink-400 via-amber-300 to-indigo-400',
    Legendary: 'bg-linear-to-b from-yellow-500 to-yellow-300',
    Mythic: 'bg-linear-to-b from-rose-600 to-rose-400',
    Epic: 'bg-linear-to-b from-fuchsia-600 to-fuchsia-400',
    'Super Rare': 'bg-linear-to-b from-blue-600 to-blue-400',
    Rare: 'bg-linear-to-b from-green-600 to-green-400',
    Common: 'bg-linear-to-b from-sky-400 to-sky-200',
  },
  clashroyale: {
    Champion: 'bg-linear-to-b from-amber-500 to-amber-300',
    Legendary: 'bg-linear-to-br from-pink-400 via-amber-300 to-cyan-400',
    Epic: 'bg-linear-to-b from-purple-600 to-purple-400',
    Rare: 'bg-linear-to-b from-orange-500 to-orange-300',
    Common: 'bg-linear-to-b from-slate-400 to-slate-300',
  },
};

// Which attributes' icons sit in a tile's top corners - the element on
// Genshin/Star Rail cards (as in the in-game Character Archive), the class
// for Brawl Stars. The element icon is also what tells Genshin's Traveler
// variants apart (they share art), and it does the same job for Star Rail's
// Trailblazer and March 7th forms, since each of their paths comes with its
// own element - so no path icon is needed. Clash Royale's card art stands on
// its own, so it gets none.
const CORNER_ATTRIBUTES: Record<GameId, { left?: string; right?: string }> = {
  genshin: { left: 'element' },
  starrail: { left: 'element' },
  brawlstars: { left: 'brawler_class' },
  clashroyale: {},
};

function attributeIcon(item: GridItem, attribute: string | undefined, game: GameId): string | undefined {
  const value = attribute ? item.attributes[attribute] : undefined;
  return value != null ? categoryIcon(String(value), game) : undefined;
}

// How an uncollected portrait is shown - a dimmed grayscale version, like
// unowned characters in Genshin's in-game Character Archive. Per game so
// any one of them can switch to a different treatment (e.g. a full
// 'brightness-0' silhouette, which needs transparent-background art).
const UNCOLLECTED_IMAGE_CLASS: Record<GameId, string> = {
  genshin: 'grayscale brightness-75',
  starrail: 'grayscale brightness-75',
  clashroyale: 'grayscale brightness-50 opacity-70',
  brawlstars: 'grayscale brightness-50 opacity-70',
};

// Clash Royale's card art already carries its own card frame, so its tiles
// skip the rarity background/name plate and show the bare card.
const FRAMELESS_TILES: Record<GameId, boolean> = {
  genshin: false,
  starrail: false,
  brawlstars: false,
  clashroyale: true,
};

// One-line tile name. A name that doesn't fit fades out at the right edge,
// and scrolls to its end and back while `scrolling` - keeps every tile the
// same height instead of wrapping.
function TileName({ name, className, scrolling }: { name: string; className: string; scrolling: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflowPx, setOverflowPx] = useState(0);

  useEffect(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text) return;
    // Re-measures on resize and once web fonts settle (both change widths).
    const observer = new ResizeObserver(() => setOverflowPx(Math.max(0, Math.ceil(text.scrollWidth - box.clientWidth))));
    observer.observe(box);
    observer.observe(text);
    return () => observer.disconnect();
  }, [name]);

  const overflows = overflowPx > 0;
  const animate = overflows && scrolling;

  return (
    <div className={`px-1.5 py-1 text-[10px] sm:text-xs font-semibold leading-tight ${className}`}>
      <div
        ref={boxRef}
        className={`overflow-hidden whitespace-nowrap ${
          overflows ? `text-left ${animate ? '' : 'mask-[linear-gradient(to_right,black_75%,transparent)]'}` : 'text-center'
        }`}
      >
        <span
          ref={textRef}
          className={`inline-block ${animate ? 'motion-safe:animate-[name-scroll_ease-in-out_infinite_alternate]' : ''}`}
          style={
            animate
              ? ({
                  '--name-scroll-distance': `-${overflowPx}px`,
                  animationDuration: `${Math.max(1.5, overflowPx / 20)}s`,
                } as CSSProperties)
              : undefined
          }
        >
          {name}
        </span>
      </div>
    </div>
  );
}

// Constellation/eidolon number square, as on the in-game character select
// screen: white on black up to C5/E5, and gold only at max (C6/E6), which
// is what makes a maxed character stand out in-game.
const COPY_MARKER_BASE = 'rounded-sm ring-1 font-extrabold leading-none flex items-center justify-center';
const COPY_MARKER_MAX_CLASS = 'bg-[#f0c96b] ring-[#a9772a] text-[#5a3a10]';
const COPY_MARKER_CLASS = 'bg-[#26262c]/85 ring-black/40 text-white';
// Locked levels in the detail modal's list.
const COPY_MARKER_LOCKED_CLASS = `${COPY_MARKER_BASE} bg-gray-100 dark:bg-gray-800 ring-transparent text-gray-400 dark:text-gray-500`;

function copyMarkerClass(level: number, max: number): string {
  return `${COPY_MARKER_BASE} ${level >= max ? COPY_MARKER_MAX_CLASS : COPY_MARKER_CLASS}`;
}

interface TileArtProps {
  game: GameId;
  item: GridItem;
  entry: CollectionEntry | undefined;
}

// A tile's picture area - rarity background, portrait (grayed out until
// collected), corner attribute icons, and the copy-level marker. Shared by
// the grid tiles and the detail modal.
function TileArt({ game, item, entry }: TileArtProps) {
  const copies = COLLECTION_COPIES[game];
  const level = entry ? copiesLevel(game, item.id, entry.timesCollected) : null;
  const leftIcon = attributeIcon(item, CORNER_ATTRIBUTES[game].left, game);
  const rightIcon = attributeIcon(item, CORNER_ATTRIBUTES[game].right, game);
  const frameless = FRAMELESS_TILES[game];

  return (
    <div
      className={`relative ${GAMES[game].avatarAspectClass} ${
        frameless ? '' : RARITY_TILE_CLASS[game][String(item.attributes.rarity)] ?? 'bg-gray-400'
      } ${entry || frameless ? '' : 'saturate-50 brightness-75'}`}
    >
      <img
        src={item.imageUrl}
        alt={item.displayName}
        loading="lazy"
        className={`absolute inset-0 w-full h-full object-contain ${entry ? '' : UNCOLLECTED_IMAGE_CLASS[game]}`}
      />
      {leftIcon && <img src={leftIcon} alt="" className="absolute top-1 left-1 w-4 h-4 sm:w-5 sm:h-5 object-contain drop-shadow" />}
      {rightIcon && <img src={rightIcon} alt="" className="absolute top-1 right-1 w-4 h-4 sm:w-5 sm:h-5 object-contain drop-shadow" />}
      {level !== null && level >= 1 && copies && (
        <span
          className={`absolute bottom-1 left-1 min-w-4 h-4 sm:min-w-5 sm:h-5 px-0.5 text-[10px] sm:text-xs shadow ${copyMarkerClass(
            level,
            copies.max,
          )}`}
        >
          {level}
        </span>
      )}
    </div>
  );
}

interface CollectionTileProps extends TileArtProps {
  onOpen: () => void;
}

function CollectionTile({ game, item, entry, onOpen }: CollectionTileProps) {
  // Hovering the tile scrolls a long name; on touch devices the detail modal
  // (opened by a tap) shows the full name instead.
  const [hovered, setHovered] = useState(false);
  const frameless = FRAMELESS_TILES[game];
  const nameColorClass = frameless
    ? entry
      ? 'text-gray-700 dark:text-gray-200'
      : 'text-gray-400 dark:text-gray-500'
    : entry
      ? 'text-[#4a5366]'
      : 'text-[#4a5366]/60';

  return (
    <button
      type="button"
      onClick={onOpen}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setHovered(false)}
      aria-label={item.displayName}
      className={`flex flex-col text-left cursor-pointer transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
        frameless ? '' : 'rounded-md overflow-hidden shadow-sm ring-1 ring-black/10 dark:ring-white/10 bg-[#ece5d8] hover:shadow-md'
      }`}
    >
      <TileArt game={game} item={item} entry={entry} />
      <TileName name={item.displayName} className={`w-full ${nameColorClass}`} scrolling={hovered} />
    </button>
  );
}

interface CollectionDetailModalProps extends TileArtProps {
  onClose: () => void;
}

// Opened by clicking a tile: when the character was first collected, and
// for games with copies, when each constellation/eidolon was obtained.
function CollectionDetailModal({ game, item, entry, onClose }: CollectionDetailModalProps) {
  const text = COLLECTION_TEXT.detail;
  const copies = COLLECTION_COPIES[game];
  const hasCopies = copies !== null && !copies.excludedItemIds.has(item.id);
  // The activation material for this character's constellations/eidolons, if
  // the game has one - shown per level instead of a bare number square.
  const copyItems = COLLECTION_COPY_ITEMS[game];
  const unlockItem = hasCopies ? copyItems?.unlock(item) ?? null : null;
  const surplusItem = hasCopies ? copyItems?.surplus(item) ?? null : null;
  // Duplicates past max copies - what a "prestige" mechanic would build on.
  const extraCopies = copies && entry ? Math.max(0, entry.timesCollected - (copies.max + 1)) : 0;

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
        role="dialog"
        aria-modal="true"
        aria-label={item.displayName}
        className="bg-white dark:bg-gray-900 rounded-xl shadow-lg w-full max-w-sm p-5 animate-[modal-in_0.15s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="font-bold text-lg leading-snug">{item.displayName}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 -mr-1 -mt-0.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div
            className={`w-24 shrink-0 ${
              FRAMELESS_TILES[game] ? '' : 'rounded-md overflow-hidden shadow-sm ring-1 ring-black/10 dark:ring-white/10'
            }`}
          >
            <TileArt game={game} item={item} entry={entry} />
          </div>
          <div className="flex flex-col gap-1 text-sm">
            {entry ? (
              <>
                <p className="font-semibold">{text.firstCollected(longDateLabel(entry.collectedDates[0]))}</p>
                <p className="text-gray-500 dark:text-gray-400">{text.timesCollected(entry.timesCollected)}</p>
              </>
            ) : (
              <>
                <p className="font-semibold">{text.notCollected}</p>
                <p className="text-gray-500 dark:text-gray-400">{text.howToCollect}</p>
              </>
            )}
          </div>
        </div>

        {copies && !hasCopies && (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{text.noCopies(copies.label)}</p>
        )}

        {copies && hasCopies && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              {text.copiesHeading(copies.label)}
            </h3>
            <ul className="flex flex-col gap-2">
              {Array.from({ length: copies.max }, (_, i) => i + 1).map((level) => {
                const date = entry?.collectedDates[level];
                return (
                  <li key={level} className="flex items-center gap-2.5 text-sm">
                    {unlockItem ? (
                      <img
                        src={unlockItem.src}
                        alt={unlockItem.name}
                        title={unlockItem.name}
                        className={`w-6 h-6 object-contain ${date ? '' : 'grayscale opacity-40'}`}
                      />
                    ) : (
                      <span
                        className={`w-6 h-6 text-xs ${date ? copyMarkerClass(level, copies.max) : COPY_MARKER_LOCKED_CLASS}`}
                      >
                        {level}
                      </span>
                    )}
                    <span className={date ? 'font-medium' : 'text-gray-400 dark:text-gray-500'}>
                      {copies.prefix}
                      {level}
                    </span>
                    <span className={`ml-auto tabular-nums ${date ? '' : 'text-gray-400 dark:text-gray-500'}`}>
                      {date ? text.copyObtained(longDateLabel(date)) : text.copyLocked}
                    </span>
                  </li>
                );
              })}

              {/* Duplicates past the last level, as the next row in the same
                  list - a per-character tally of the surplus item, which a
                  collection-wide total could later sum up. */}
              {extraCopies > 0 && surplusItem && (
                <li className="flex items-center gap-2.5 text-sm">
                  <img src={surplusItem.src} alt={surplusItem.name} className="w-6 h-6 object-contain" />
                  <span className="font-medium">{surplusItem.name}</span>
                  <span className="ml-auto tabular-nums font-semibold">{text.extraCopies(extraCopies)}</span>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

type Filter = keyof typeof COLLECTION_TEXT.page.filters;

export default function CollectionPage() {
  const { game } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const validGame = isValidGameId(game) ? game : undefined;
  const [roster, setRoster] = useState<GridItem[] | null>(null);
  const [collection, setCollection] = useState<Map<string, CollectionEntry> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (!user || !validGame) return;
    let cancelled = false;
    Promise.all([fetchItems(validGame), fetchCollection(validGame)])
      .then(([items, entries]) => {
        if (cancelled) return;
        setRoster(items);
        setCollection(new Map(entries.map((e) => [e.itemId, e])));
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [user, validGame]);

  if (!validGame) {
    return <NotFoundPage />;
  }

  if (authLoading) {
    return (
      <main className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </main>
    );
  }

  if (!user) {
    return <Navigate to={`/${validGame}`} replace />;
  }

  const gameConfig = GAMES[validGame];
  const text = COLLECTION_TEXT.page;
  const openItem = openItemId ? roster?.find((item) => item.id === openItemId) : undefined;
  const rarityOrder = RARITY_ORDER[validGame];
  const rarityRank = (item: GridItem) => {
    const rank = rarityOrder.indexOf(String(item.attributes.rarity));
    return rank === -1 ? rarityOrder.length : rank;
  };

  const sorted = roster
    ? [...roster].sort((a, b) => rarityRank(a) - rarityRank(b) || a.displayName.localeCompare(b.displayName))
    : [];
  const collectedCount = collection ? sorted.filter((item) => collection.has(item.id)).length : 0;
  const visible = sorted.filter((item) => {
    if (filter === 'all' || !collection) return true;
    return filter === 'collected' ? collection.has(item.id) : !collection.has(item.id);
  });

  return (
    <main className="flex flex-col items-center gap-5 py-8 px-4 motion-safe:animate-[page-in_350ms_ease-out]">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2">
          {/* Invisible mirror of the HelpButton, same as ArchiveListPage - keeps
              the title centered instead of shifted left by a right-only icon. */}
          <div className="invisible" aria-hidden="true">
            <HelpButton onClick={() => {}} label="" />
          </div>
          <h1 className="text-2xl font-bold">{text.title}</h1>
          <HelpButton onClick={() => setHelpOpen(true)} label="About your collection" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{gameConfig.label}</p>
      </div>

      {helpOpen && (
        <HelpModal title={text.title} onClose={() => setHelpOpen(false)}>
          {text.info(validGame).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </HelpModal>
      )}

      {error && <ErrorState message={text.loadError(error)} />}

      {!error && (!roster || !collection) && <LoadingSpinner label={text.loading} size="md" />}

      {!error && roster && collection && (
        <>
          <div className="w-full max-w-sm flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <img src={gameConfig.dailyGuessIcon} alt="" className="w-5 h-5 object-contain" />
                {text.progressLabel}
              </span>
              <span className="tabular-nums font-semibold">
                {collectedCount} / {sorted.length}
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${sorted.length ? (100 * collectedCount) / sorted.length : 0}%` }}
              />
            </div>
          </div>

          <div className="flex gap-1 p-1 rounded-full bg-gray-200 dark:bg-gray-800 text-sm font-medium">
            {(['all', 'collected', 'missing'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                aria-pressed={filter === option}
                className={`px-3 py-1 rounded-full transition cursor-pointer ${
                  filter === option
                    ? 'bg-white dark:bg-gray-900 shadow-sm text-gray-900 dark:text-gray-100'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {text.filters[option]}
              </button>
            ))}
          </div>

          <div className="w-full max-w-4xl grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3">
            {visible.map((item) => (
              <CollectionTile
                key={item.id}
                game={validGame}
                item={item}
                entry={collection.get(item.id)}
                onOpen={() => setOpenItemId(item.id)}
              />
            ))}
          </div>
        </>
      )}

      {openItem && collection && (
        <CollectionDetailModal
          game={validGame}
          item={openItem}
          entry={collection.get(openItem.id)}
          onClose={() => setOpenItemId(null)}
        />
      )}
    </main>
  );
}
