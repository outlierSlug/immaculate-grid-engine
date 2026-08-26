import genshinHero from '../assets/genshin/wallpapers/Version4.7Wallpaper.jpg';
import genshinLogo from '../assets/genshin/Logo_ENG.png';
import brawlStarsHero from '../assets/brawlstars/wallpapers/loading_2020_arcade.png';
import brawlStarsLogo from '../assets/brawlstars/BS_EN.png';
import clashRoyaleHero from '../assets/clashroyale/wallpapers/group_champions.png';
import clashRoyaleLogo from '../assets/clashroyale/Clash_Royale_Logo_cropped.png';
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
    // Shape mask for character-portrait thumbnails (PuzzleGrid filled
    // cells, PuzzleStatsBoard, CommunityAnswersModal, GuessInput's result
    // rows). Genshin's source images have no built-in frame, so a circular
    // crop reads cleanly.
    avatarShapeClass: 'rounded-full',
    // Every avatar box is sized as a fixed height + this aspect ratio (see
    // the avatarAspectClass comment on Clash Royale below for why it's not
    // just a fixed width/height pair) - square for portraits with no strong
    // native shape of their own.
    avatarAspectClass: 'aspect-square',
    // --grid-avatar (not the bigger --grid-avatar-card) - only Clash
    // Royale's narrower aspect needs the taller variable to reach a
    // comparable visual size, see games.ts's clashroyale entry.
    avatarSizeClass: 'h-(--grid-avatar)',
    // Plain portrait art with no border of its own - needs this frame for
    // definition against the cell background.
    avatarBorderClass: 'border border-gray-200 dark:border-gray-700',
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
    // Brawl Stars' brawler portraits already bake their own square frame
    // into the source image - a circular mask on top clipped that frame's
    // corners, so these stay unmasked squares instead (no rounding at all,
    // not even a soft radius, so none of the baked-in border is cropped).
    avatarShapeClass: 'rounded-none',
    avatarAspectClass: 'aspect-square',
    avatarSizeClass: 'h-(--grid-avatar)',
    // Unlike Clash Royale below, left as-is (not revisited) - not part of
    // this change's scope.
    avatarBorderClass: 'border border-gray-200 dark:border-gray-700',
  },
  clashroyale: {
    id: 'clashroyale',
    label: 'Clash Royale',
    // Official key art (Supercell fankit) - subjects (Golden Knight,
    // Skeleton King, Archer Queen) sit in the upper half of the frame, not
    // centered - crop toward that band so faces survive at every card
    // aspect ratio instead of the empty ground/legs at the bottom.
    heroImages: [{ src: clashRoyaleHero, objectPosition: '50% 35%' }] satisfies HeroImage[],
    logoImage: clashRoyaleLogo,
    // Unlike Logo_ENG.png/BS_EN.png (already tightly cropped to their
    // wordmark before ever landing in assets/), the fankit export here was
    // a padded 3000x1500 canvas with the actual wordmark occupying only the
    // middle ~59% of the width (x=[590,2368]) - showing it at full canvas
    // width (this component's usual "match height, crop only" trick) left
    // dead space on both sides and visibly off-center-left compared to the
    // other two cards. Cropped to the wordmark's own alpha bbox instead
    // (Clash_Royale_Logo_cropped.png, 1778x766) so it behaves like the
    // other two sources: content fills the full cropped canvas, aspect
    // is just that canvas's own ratio, no padding left to correct for.
    logoAspectClass: 'aspect-[2.32]',
    logoObjectPosition: '50% 50%',
    // Indigo/violet for the "royal" crown-and-castle branding - distinct
    // from Genshin's sky and Brawl Stars' amber.
    accentRingClass: 'hover:ring-indigo-400',
    dotClass: 'bg-indigo-400',
    selectedRingClass: 'ring-indigo-400',
    // Card icons bake their own rounded-rect card frame into the source
    // image (see download_icons.py) - same reasoning as Brawl Stars'
    // baked-in square frame, a mask on top would clip that frame's corners.
    avatarShapeClass: 'rounded-none',
    // Card icons are 285x420 (a real trading-card portrait, not a square
    // headshot like Genshin/Brawl Stars) - forcing them into a square box
    // via object-cover cropped off the top/bottom of every card. Every
    // avatar box across the app is sized as a fixed HEIGHT plus this aspect
    // class (width derived, same "fixed height + aspect" trick GameCard
    // already uses for logos) rather than a fixed width+height pair, so the
    // box narrows to exactly the card's own shape instead of overflowing
    // the fixed-height grid cells this renders inside - the whole card
    // shows uncropped without needing any grid/cell resizing. 19/28 is
    // 285/420 in lowest terms.
    avatarAspectClass: 'aspect-[19/28]',
    // --grid-avatar-card, not the shared --grid-avatar: at any given
    // height, a 19/28 box is narrower than a square one, so it needs more
    // height to reach a comparable visual size - see the
    // --grid-avatar-card comment in index.css.
    avatarSizeClass: 'h-(--grid-avatar-card)',
    // No border - the card's own baked-in black card-frame (see
    // avatarShapeClass above) already reads as a frame; adding this
    // project's usual thin gray border on top doubled up as a
    // border-within-a-border and visually shrank the art inside it.
    avatarBorderClass: '',
  },
} as const;

export type GameId = keyof typeof GAMES;

export function isValidGameId(game: string | undefined): game is GameId {
  return game !== undefined && game in GAMES;
}
