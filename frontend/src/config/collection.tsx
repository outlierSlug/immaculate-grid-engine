import type { ReactNode } from 'react';
import type { GameId } from './games';

// Per-game duplicate-copy mechanic for the character collection. The
// backend only counts how many live Dailies an item was collected in (see
// UserCollectionService) - what that count means lives here. null means
// collected-once only (Pokedex-style), for games with no gacha dupe system.
export interface CopiesConfig {
  label: string;
  prefix: string;
  max: number;
  excludedItemIds: ReadonlySet<string>;
}

export const COLLECTION_COPIES: Record<GameId, CopiesConfig | null> = {
  // Aloy is the one Genshin character with no constellations at all.
  genshin: { label: 'Constellation', prefix: 'C', max: 6, excludedItemIds: new Set(['genshin:aloy']) },
  starrail: { label: 'Eidolon', prefix: 'E', max: 6, excludedItemIds: new Set() },
  brawlstars: null,
  clashroyale: null,
};

// Every player-facing string for the collection feature, in one place:
// the live Daily grid's badge tooltips, the collection page, and the
// detail modal a collection tile opens. `copyName` is e.g. "Constellation 3".
export const COLLECTION_TEXT = {
  badge: {
    newCharacter: (finished: boolean) =>
      finished ? 'New! Added to your collection' : "New! Finish today's puzzle to add to your collection",
    unlocksCopy: (copyName: string, finished: boolean) =>
      finished ? `Unlocked ${copyName}` : `Finish today's puzzle to unlock ${copyName}`,
    atMaxCopies: (copyName: string) => `Already at ${copyName}`,
    alreadyCollected: 'Already in your collection',
  },
  page: {
    title: 'Collection',
    progressLabel: 'Collected',
    filters: { all: 'All', collected: 'Collected', missing: 'Not Collected' },
    loading: 'Loading your collection...',
    loadError: (message: string) => `Failed to load your collection: ${message}`,
    // Paragraphs of the (i) info modal next to the page title.
    info: (game: GameId): ReactNode[] => {
      const noun = COLLECTION_TEXT.itemNouns[game];
      const copies = COLLECTION_COPIES[game];
      return [
        <>
          Every {noun.singular} you correctly guess in a <b>live Daily Puzzle</b> is added to your collection once you
          finish that puzzle.
        </>,
        <>
          Unlimited Mode and Archived puzzles <b>don't</b> count toward your collection.
        </>,
        copies ? (
          <>
            Guessing an already-collected {noun.singular} again on a later Daily unlocks its next{' '}
            <b>{copies.label.toLowerCase()}</b>, up to {copies.prefix}
            {copies.max}.
          </>
        ) : (
          <>
            Each {noun.singular} only needs to be collected <b>once</b>.
          </>
        ),
        <>
          Every Daily you've played while signed in counts, including ones from before collections existed.
        </>,
        <>
          Select any {noun.singular} to see when it was first collected
          {copies ? ` and when each ${copies.label.toLowerCase()} was unlocked` : ''}.
        </>,
      ];
    },
  },
  // Post-Daily summary modal. What a collected item is called per game.
  itemNouns: {
    genshin: { singular: 'character', plural: 'characters' },
    starrail: { singular: 'character', plural: 'characters' },
    brawlstars: { singular: 'brawler', plural: 'brawlers' },
    clashroyale: { singular: 'card', plural: 'cards' },
  } satisfies Record<GameId, { singular: string; plural: string }>,
  summary: {
    // e.g. "Collected 2 new characters and 1 new constellation" - null (no
    // message shown) when today's puzzle added nothing new.
    gains: (newItems: number, itemNoun: { singular: string; plural: string }, newCopies: number, copyLabel: string | null) => {
      const parts: string[] = [];
      if (newItems > 0) parts.push(`${newItems} new ${newItems === 1 ? itemNoun.singular : itemNoun.plural}`);
      if (newCopies > 0 && copyLabel) parts.push(`${newCopies} new ${copyLabel.toLowerCase()}${newCopies === 1 ? '' : 's'}`);
      return parts.length > 0 ? `Collected ${parts.join(' and ')}` : null;
    },
  },
  detail: {
    firstCollected: (date: string) => `First collected on ${date}`,
    timesCollected: (count: number) => `Collected in ${count} Daily ${count === 1 ? 'puzzle' : 'puzzles'}`,
    notCollected: 'Not collected yet',
    howToCollect: 'Guess correctly in a live Daily puzzle to add to your collection.',
    copiesHeading: (label: string) => `${label}s`,
    copyObtained: (date: string) => `Obtained ${date}`,
    copyLocked: 'Not yet unlocked',
    noCopies: (label: string) => `No ${label.toLowerCase()}s for this character.`,
  },
};

// First copy is C0/E0, each further copy adds one level, capped at max.
// null when this game (or this specific item) has no copies mechanic.
export function copiesLevel(game: GameId, itemId: string, timesCollected: number): number | null {
  const copies = COLLECTION_COPIES[game];
  if (!copies || copies.excludedItemIds.has(itemId) || timesCollected < 1) return null;
  return Math.min(timesCollected - 1, copies.max);
}

// What one correct live-Daily guess adds, given how many copies were
// collected before today: a new item, the next copy level, or nothing
// (already collected in a no-copies game, or already at max copies).
export type GuessGain = { kind: 'new' } | { kind: 'copy'; level: number } | { kind: 'none'; atMaxCopies: boolean };

export function guessGain(game: GameId, itemId: string, priorTimesCollected: number): GuessGain {
  if (priorTimesCollected === 0) return { kind: 'new' };
  const copies = COLLECTION_COPIES[game];
  const level = copiesLevel(game, itemId, priorTimesCollected + 1);
  if (copies && level !== null && priorTimesCollected <= copies.max) return { kind: 'copy', level };
  return { kind: 'none', atMaxCopies: level !== null };
}

// The post-Daily summary's "Collected ..." line for today's correct picks,
// or null when they added nothing new.
export function collectionGainsMessage(game: GameId, itemIds: string[], priorCounts: Map<string, number>): string | null {
  let newItems = 0;
  let newCopies = 0;
  for (const itemId of itemIds) {
    const gain = guessGain(game, itemId, priorCounts.get(itemId) ?? 0);
    if (gain.kind === 'new') newItems++;
    if (gain.kind === 'copy') newCopies++;
  }
  return COLLECTION_TEXT.summary.gains(newItems, COLLECTION_TEXT.itemNouns[game], newCopies, COLLECTION_COPIES[game]?.label ?? null);
}
