// Shared by every "share of players who picked this answer" display
// (PuzzleGrid, PuzzleStatsBoard, CommunityAnswersModal). Below 1%,
// Math.round would show "0%" - indistinguishable from "nobody ever
// picked this," which is a real, different thing (the answer count badge
// already covers that case). Below 1, show one decimal place instead
// ("0.3%") so a genuine minority pick still reads as real, falling back
// to "<0.1%" only once even a decimal would round away to "0.0%".
export function formatPercent(percent: number): string {
  if (percent <= 0) return '0%';
  if (percent >= 1) return `${Math.round(percent)}%`;
  const oneDecimal = percent.toFixed(1);
  return oneDecimal === '0.0' ? '<0.1%' : `${oneDecimal}%`;
}
