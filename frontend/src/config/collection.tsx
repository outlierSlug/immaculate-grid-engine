import type { ReactNode } from 'react';
import type { GameId } from './games';
import type { GridItem } from '../types/puzzle';

import stellaFortuna5Icon from '../assets/genshin/constellations/Item_Stella_Fortuna_5_star.webp';
import stellaFortuna4Icon from '../assets/genshin/constellations/Item_Stella_Fortuna_4_star.webp';
import masterlessStellaFortunaIcon from '../assets/genshin/constellations/Item_Masterless_Stella_Fortuna.webp';
import masterlessStarglitterIcon from '../assets/genshin/constellations/Item_Masterless_Starglitter.webp';
import primogemIcon from '../assets/genshin/constellations/Item_Primogem.webp';
import memoryRovingGalesIcon from '../assets/genshin/constellations/Item_Memory_of_Roving_Gales.webp';
import memoryImmovableCrystalsIcon from '../assets/genshin/constellations/Item_Memory_of_Immovable_Crystals.webp';
import memoryVioletFlashIcon from '../assets/genshin/constellations/Item_Memory_of_Violet_Flash.webp';
import memoryFlourishingGreenIcon from '../assets/genshin/constellations/Item_Memory_of_Flourishing_Green.webp';
import memoryRunningStreamIcon from '../assets/genshin/constellations/Item_Memory_of_Running_Stream.webp';
import memoryPiercingFrostIcon from '../assets/genshin/constellations/Item_Memory_of_Piercing_Frost.webp';
import blazingFlintOreIcon from '../assets/genshin/constellations/Item_Blazing_Flint_Ore.webp';

import eidolon5Icon from '../assets/starrail/eidolons/Item_Eidolon_5_star.webp';
import eidolon4Icon from '../assets/starrail/eidolons/Item_Eidolon_4_star.webp';
import shadowDestructionIcon from '../assets/starrail/eidolons/Item_Shadow_of_Destruction.webp';
import shadowPreservationIcon from '../assets/starrail/eidolons/Item_Shadow_of_Preservation.webp';
import shadowHarmonyIcon from '../assets/starrail/eidolons/Item_Shadow_of_Harmony.webp';
import shadowRemembranceIcon from '../assets/starrail/eidolons/Item_Shadow_of_Remembrance.webp';
import shadowElationIcon from '../assets/starrail/eidolons/Item_Shadow_of_Elation.webp';
import undyingStarlightIcon from '../assets/starrail/eidolons/Item_Undying_Starlight.webp';
import stellarJadeIcon from '../assets/starrail/eidolons/Item_Stellar_Jade.webp';

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

// The in-game item that activates a constellation: a character's own Stella
// Fortuna, except the Traveler, whose constellations take an element-specific
// Memory (Pyro's is Blazing Flint Ore, not a Memory at all).
const GENSHIN_MEMORIES: Record<string, CopyItem> = {
  Anemo: { src: memoryRovingGalesIcon, name: 'Memory of Roving Gales' },
  Geo: { src: memoryImmovableCrystalsIcon, name: 'Memory of Immovable Crystals' },
  Electro: { src: memoryVioletFlashIcon, name: 'Memory of Violet Flash' },
  Dendro: { src: memoryFlourishingGreenIcon, name: 'Memory of Flourishing Green' },
  Hydro: { src: memoryRunningStreamIcon, name: 'Memory of Running Stream' },
  Cryo: { src: memoryPiercingFrostIcon, name: 'Memory of Piercing Frost' },
  // The one element whose Traveler constellations don't take a Memory.
  Pyro: { src: blazingFlintOreIcon, name: 'Blazing Flint Ore' },
};

const STELLA_FORTUNA_5: CopyItem = { src: stellaFortuna5Icon, name: 'Stella Fortuna' };
const STELLA_FORTUNA_4: CopyItem = { src: stellaFortuna4Icon, name: 'Stella Fortuna' };
const MASTERLESS_STELLA_FORTUNA: CopyItem = { src: masterlessStellaFortunaIcon, name: 'Masterless Stella Fortuna' };
const MASTERLESS_STARGLITTER: CopyItem = { src: masterlessStarglitterIcon, name: 'Masterless Starglitter' };
const PRIMOGEM: CopyItem = { src: primogemIcon, name: 'Primogem' };

// Star Rail's equivalents: a rarity-specific Eidolon item for everyone, and
// a path-specific Shadow for the Trailblazer's own eidolons. March 7th is an
// ordinary 4-star despite her forms, so she takes the Eidolon item.
const STARRAIL_SHADOWS: Record<string, CopyItem> = {
  Destruction: { src: shadowDestructionIcon, name: 'Shadow of Destruction' },
  Preservation: { src: shadowPreservationIcon, name: 'Shadow of Preservation' },
  Harmony: { src: shadowHarmonyIcon, name: 'Shadow of Harmony' },
  Remembrance: { src: shadowRemembranceIcon, name: 'Shadow of Remembrance' },
  Elation: { src: shadowElationIcon, name: 'Shadow of Elation' },
};

const EIDOLON_5: CopyItem = { src: eidolon5Icon, name: 'Eidolon' };
const EIDOLON_4: CopyItem = { src: eidolon4Icon, name: 'Eidolon' };
const UNDYING_STARLIGHT: CopyItem = { src: undyingStarlightIcon, name: 'Undying Starlight' };
const STELLAR_JADE: CopyItem = { src: stellarJadeIcon, name: 'Stellar Jade' };

const isGenshinTraveler = (item: GridItem) => item.id.startsWith('genshin:traveler-');
const isStarRailTrailblazer = (item: GridItem) => item.id.startsWith('starrail:trailblazer-');
const isFiveStar = (item: GridItem) => String(item.attributes.rarity) === '5';

// The in-game item a duplicate actually hands you, shown on the live Daily's
// cell badge (and named in the detail modal). `unlock` is the material that
// activates the next copy level; `surplus` is what a duplicate yields once
// the item is already maxed. Either may return null, which falls back to the
// game's wish icon - so a game can configure only the cases it has a real
// item for.
export interface CopyItem {
  src: string;
  name: string;
}

export interface CopyItems {
  unlock: (item: GridItem) => CopyItem | null;
  surplus: (item: GridItem) => CopyItem | null;
}

export const COLLECTION_COPY_ITEMS: Record<GameId, CopyItems | null> = {
  genshin: {
    unlock: (item) =>
      isGenshinTraveler(item)
        ? GENSHIN_MEMORIES[String(item.attributes.element)] ?? null
        : isFiveStar(item)
          ? STELLA_FORTUNA_5
          : STELLA_FORTUNA_4,
    // Past C6 a 5-star's duplicates become Masterless Stella Fortuna and a
    // 4-star's Masterless Starglitter. The Traveler can't exceed C6 in-game
    // at all, so its variants get a Primogem as an easter egg.
    surplus: (item) =>
      isGenshinTraveler(item) ? PRIMOGEM : isFiveStar(item) ? MASTERLESS_STELLA_FORTUNA : MASTERLESS_STARGLITTER,
  },
  starrail: {
    unlock: (item) =>
      isStarRailTrailblazer(item)
        ? STARRAIL_SHADOWS[String(item.attributes.path)] ?? null
        : isFiveStar(item)
          ? EIDOLON_5
          : EIDOLON_4,
    // Star Rail has no Masterless tier - past E6 every duplicate just becomes
    // Undying Starlight, with Stellar Jade for the Trailblazer variants (same
    // easter egg as Genshin's Primogem, since the Trailblazer can't pass E6).
    surplus: (item) => (isStarRailTrailblazer(item) ? STELLAR_JADE : UNDYING_STARLIGHT),
  },
  // No duplicate mechanic in these games, so no duplicate item either.
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
    // Duplicates collected past max copies, which grant no further level -
    // listed right under the last one as its own row.
    extraCopies: (count: number) => `x${count}`,
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
