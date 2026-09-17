import { GAMES, type GameId } from '../config/games';
import { COLLECTION_COPIES, COLLECTION_TEXT, guessGain } from '../config/collection';

interface CollectionCellBadgeProps {
  game: GameId;
  itemId: string;
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

// Top-left corner badge on a correctly-filled live Daily cell - always the
// game's wish icon. Full color when this guess gains something (a new
// character, or the next constellation/eidolon - named in the tooltip);
// green-outlined when there's nothing left to gain (already collected in a
// no-copies game, or already at max copies).
export default function CollectionCellBadge({ game, itemId, priorTimesCollected, obtained }: CollectionCellBadgeProps) {
  const copies = COLLECTION_COPIES[game];
  const gain = guessGain(game, itemId, priorTimesCollected);
  const nothingToGain = gain.kind === 'none';

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
        src={GAMES[game].dailyGuessIcon}
        alt=""
        className={`h-[1.9em] w-[1.9em] object-contain ${nothingToGain ? '' : 'drop-shadow-sm'}`}
        style={nothingToGain ? { filter: OUTLINE_FILTER } : undefined}
      />
    </span>
  );
}
