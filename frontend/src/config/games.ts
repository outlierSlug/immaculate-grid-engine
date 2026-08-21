import genshinHero from '../assets/genshin/Version4.7Wallpaper.jpg';
import genshinLogo from '../assets/genshin/Logo_ENG.png';
import brawlStarsHero from '../assets/brawlstars/loading_2020_arcade.png';
import brawlStarsLogo from '../assets/brawlstars/BS_EN.png';
import type { HeroImage } from '../hooks/useRandomHeroImage';

export const GAMES = {
  genshin: {
    id: 'genshin',
    label: 'Genshin Impact',
    // Official key art (Cognosphere / HoYoverse) - used on both the home
    // page GameCard and the SettingsModal game-switch row, so the two stay
    // visually consistent. One entry today; drop more wide key-art images
    // into assets/genshin and add entries here to start real rotation -
    // useRandomHeroImage already picks randomly per mount, no other code
    // changes needed once there's more than one to pick from.
    heroImages: [{ src: genshinHero, objectPosition: '50% 40%' }] satisfies HeroImage[],
    logoImage: genshinLogo,
    // Logo_ENG.png is a padded 512x512 square. Measured exactly via a
    // canvas alpha-bounds scan (not eyeballed): the wordmark's actual
    // non-transparent pixels span x=[5,506] y=[153,337] of the 512x512
    // canvas - 35.9% of the height, vertically centered at 47.9%. The
    // aspect below is derived from that (srcAspect / contentHeightFrac)
    // so object-cover's crop window height matches the content height
    // exactly, rather than a guessed ratio.
    logoAspectClass: 'aspect-[2.78]',
    logoObjectPosition: '50% 48%',
    // Tailwind class literals (not built dynamically) so the JIT scanner
    // picks them up - see GameCard.
    accentRingClass: 'hover:ring-sky-300',
    dotClass: 'bg-sky-400',
    // Non-hover ring, used for the "currently selected" state in
    // SettingsModal's game list (distinct from accentRingClass above, which
    // is hover-only and used on the home page GameCards).
    selectedRingClass: 'ring-sky-400',
  },
  brawlstars: {
    id: 'brawlstars',
    label: 'Brawl Stars',
    // Official key art (Supercell fankit) - same rule as above.
    heroImages: [{ src: brawlStarsHero, objectPosition: '50% 45%' }] satisfies HeroImage[],
    logoImage: brawlStarsLogo,
    // BS_EN.png (1502x852) measured the same way: content spans
    // x=[16,1485] y=[74,777] - 82.5% of the height (much less padding than
    // Genshin's logo, but not zero), vertically centered at 49.9%. Same
    // derivation as above - this is NOT just "close to native aspect",
    // it's specifically sized so both logos' actual glyph content fills
    // the same box height, which native aspect alone doesn't guarantee.
    logoAspectClass: 'aspect-[2.14]',
    logoObjectPosition: '50% 50%',
    accentRingClass: 'hover:ring-amber-400',
    dotClass: 'bg-amber-400',
    selectedRingClass: 'ring-amber-400',
  },
} as const;

export type GameId = keyof typeof GAMES;

export function isValidGameId(game: string | undefined): game is GameId {
  return game !== undefined && game in GAMES;
}
