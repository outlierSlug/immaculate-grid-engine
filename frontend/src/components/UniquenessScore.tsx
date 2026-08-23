import ClickTooltip from './ClickTooltip';

interface UniquenessScoreProps {
  // Live — recomputed on every render from currently-filled cells and the
  // latest community data, not frozen until the game genuinely ends.
  score: number;
  // null when there's no one else finished to compare against yet - either
  // nobody has finished at all, or (once youFinished) you're the only one
  // so far. youFinished disambiguates which of those two null-percentile
  // cases this is, since they read very differently to the player.
  percentile: number | null;
  youFinished: boolean;
}

// Occupies the slot Timer used to hold in Daily mode - deliberately not a
// modal, just a small dismissible tooltip, per the "click for a tooltip"
// request (not "open a modal"). Same ClickTooltip used by CategoryChip's
// trait/region icons, for a consistent header + body look across the app.
export default function UniquenessScore({ score, percentile, youFinished }: UniquenessScoreProps) {
  const message =
    percentile == null
      ? youFinished
        ? "You're the first completion today!"
        : "No one has finished today's puzzle yet. Check back soon for a comparison."
      : `You scored a uniqueness of ${score}, which is better than ${percentile.toFixed(1)}% of players today.`;

  return (
    <ClickTooltip heading="Uniqueness Score" description={message}>
      <span className="font-mono text-lg font-semibold text-gray-700 dark:text-gray-300 tabular-nums hover:text-gray-900 dark:hover:text-gray-100">
        UNIQ {score}
      </span>
    </ClickTooltip>
  );
}
