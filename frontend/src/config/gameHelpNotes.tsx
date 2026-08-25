import type { ReactNode } from 'react';
import type { GameId } from './games';

// Extra help-modal notes specific to one game, rendered identically
// wherever that game's puzzle grid appears (Daily, Archive, Unlimited).
// Kept here once instead of duplicated at each page's own inline help
// content - a per-game caveat like Genshin's non-native-character note
// needs to show up on every page for that game, and a second/third page
// silently drifting out of sync with the first is exactly the bug class
// this avoids. Page-specific content (generic puzzle rules, Unlimited's own
// sandbox note, Archive's own note) isn't duplicated across games or pages,
// so it stays inline at each page's own call site - only genuinely
// game-specific, genuinely page-spanning notes belong here.
export const GAME_HELP_NOTES: Partial<Record<GameId, ReactNode[]>> = {
  genshin: [
    <>
      Only <b>playable characters</b> released up through Version 7.0 are selectable. The Manekin/Manekina is not a
      selectable character.
    </>,
    <>
      Aloy, Nicole, Skirk, and the Traveler don't originate from any of Teyvat's nations, so they <b>never count</b> for a
      region category.
    </>,
    <>
      Traveler is selectable as <b>either</b> Aether/Lumine, and <b>any</b> of their 7 playable elements.
      Each of the Traveler's element variants counts for the <b>Version</b> in which that <b>specific element became
      playable</b> (e.g. Dendro Traveler is Version 3.0), not the Version the Traveler itself first debuted in (1.0).
    </>,
  ],
  brawlstars: [
    <>
      Only <b>playable brawlers</b> released up through August 2026 are selectable. Buzz Lightyear is not a selectable character.
    </>,
    <>
      A brawler's <b>Release Year</b> is considered the year in which the brawler was first available to <b>all</b> players, including
      if that brawler was given away for free that year. Early access offers do <b>not</b> count towards a brawler's release year.
    </>,
  ],
};
