import { GAMES, type GameId } from '../config/games';
import { COLLECTION_COPIES, COLLECTION_COPY_ITEMS, COLLECTION_TEXT, guessGain } from '../config/collection';
import type { GridItem } from '../types/puzzle';

interface CollectionCellBadgeProps {
  game: GameId;
  item: GridItem;
  // Copies collected before today's puzzle - never includes today's, so the
  // badge reads the same before and after this attempt is recorded.
  priorTimesCollected: number;
  // Whether today's attempt is finished (and so actually recorded) - only
  // changes the tooltip wording, not what the badge shows.
  obtained: boolean;
}

// A 1px green outline traced around the icon's own shape - drop-shadow
// follows the image's transparency, unlike a border.
const OUTLINE_FILTER = ['1px 0', '-1px 0', '0 1px', '0 -1px'].map((o) => `drop-shadow(${o} 0 #22c55e)`).join(' ');

// Top-left corner badge on a correctly-filled live Daily cell, showing what
// this guess hands you: the game's wish icon for a new character, and for a
// duplicate, the item that duplicate yields in-game where the game has one
// (see COLLECTION_COPY_ICONS) - a Stella Fortuna for the constellation it
// unlocks, or a Masterless Stella Fortuna once already at C6. It's
// green-outlined when there's nothing left to gain (already collected in a
// no-copies game, or already at max copies).
export default function CollectionCellBadge({ game, item, priorTimesCollected, obtained }: CollectionCellBadgeProps) {
  const copies = COLLECTION_COPIES[game];
  const gain = guessGain(game, item.id, priorTimesCollected);
  const copyItems = COLLECTION_COPY_ITEMS[game];

  const copyItem =
    gain.kind === 'copy'
      ? copyItems?.unlock(item)
      : gain.kind === 'none' && gain.atMaxCopies
        ? copyItems?.surplus(item)
        : null;
  const iconSrc = copyItem?.src ?? GAMES[game].dailyGuessIcon;
  // The green outline is what marks "nothing to gain" when the icon alone
  // can't - it's redundant (and busy) on a game whose surplus item has its
  // own distinct icon, like Genshin's Masterless Stella Fortuna.
  const nothingToGain = gain.kind === 'none' && !copyItem;

  let title: string;
  if (gain.kind === 'new') {
    title = COLLECTION_TEXT.badge.newCharacter(obtained);
  } else if (gain.kind === 'copy' && copies) {
    title = COLLECTION_TEXT.badge.unlocksCopy(`${copies.label} ${gain.level}`, obtained);
  } else {
    title =
      gain.kind === 'none' && gain.atMaxCopies && copies
        ? COLLECTION_TEXT.badge.atMaxCopies(`${copies.label} ${copies.max}`)
        : COLLECTION_TEXT.badge.alreadyCollected;
  }

  return (
    <span title={title} aria-label={title} className="inline-flex">
      <img
        src={iconSrc}
        alt=""
        className={`h-[1.9em] w-[1.9em] object-contain ${nothingToGain ? '' : 'drop-shadow-sm'}`}
        style={nothingToGain ? { filter: OUTLINE_FILTER } : undefined}
      />
    </span>
  );
}
