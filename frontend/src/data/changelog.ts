import { DISCORD_INVITE_URL } from '../config/links';

// Hand-curated, player-facing log of launches and notable post-launch
// changes (new games, data fixes that change what shows up as an answer)
// - NOT auto-generated from git history, which is full of internal
// refactor/cleanup language a player has no reason to see. Keep entries
// terse and about what a player would actually notice; routine polish/bug
// fixes that don't change the answer key or add a game don't belong here.
// Newest first.
export interface ChangelogEntry {
  date: string; // yyyy-mm-dd, local calendar date (see utils/dateIso.ts)
  text: string;
  // Optional - if set, `link.text` must appear verbatim inside `text`;
  // HelpModal renders that substring as a link to `link.url` instead of
  // plain text. Rare (most entries need no link at all), so this stays a
  // simple exact-substring split rather than real markdown parsing.
  link?: { text: string; url: string };
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-09-05',
    text: 'Created the GachaGrid Discord server.',
    link: { text: 'GachaGrid Discord', url: DISCORD_INVITE_URL },
  },
  { date: '2026-08-26', text: 'Added Honkai: Star Rail.' },
  { date: '2026-08-25', text: 'Added Clash Royale.' },
  { date: '2026-08-24', text: 'Launch date! GachaGrid went live with Genshin Impact and Brawl Stars.' },
];
