import { useState } from 'react';
import ClickTooltip from './ClickTooltip';
import type { GameId } from '../config/games';
import mondstadtIcon from '../assets/genshin/regions/Mondstadt_Emblem_Night.webp';
import liyueIcon from '../assets/genshin/regions/Liyue_Emblem_Night.webp';
import inazumaIcon from '../assets/genshin/regions/Inazuma_Emblem_Night.webp';
import sumeruIcon from '../assets/genshin/regions/Sumeru_Emblem_Night.webp';
import fontaineIcon from '../assets/genshin/regions/Fontaine_Emblem_Night.webp';
import natlanIcon from '../assets/genshin/regions/Natlan_Emblem_Night.webp';
import nodKraiIcon from '../assets/genshin/regions/Nod-Krai_Emblem_Night.webp';
import snezhnayaIcon from '../assets/genshin/regions/Emblem_Snezhnaya.webp';

import anemoIcon from '../assets/genshin/elements/Element_Anemo.svg';
import geoIcon from '../assets/genshin/elements/Element_Geo.svg';
import electroIcon from '../assets/genshin/elements/Element_Electro.svg';
import dendroIcon from '../assets/genshin/elements/Element_Dendro.svg';
import hydroIcon from '../assets/genshin/elements/Element_Hydro.svg';
import pyroIcon from '../assets/genshin/elements/Element_Pyro.svg';
import cryoIcon from '../assets/genshin/elements/Element_Cryo.svg';

import bowIcon from '../assets/genshin/weapons/Weapon-class-bow-icon.webp';
import catalystIcon from '../assets/genshin/weapons/Weapon-class-catalyst-icon.webp';
import claymoreIcon from '../assets/genshin/weapons/Weapon-class-claymore-icon.webp';
import polearmIcon from '../assets/genshin/weapons/Weapon-class-polearm-icon.webp';
import swordIcon from '../assets/genshin/weapons/Weapon-class-sword-icon.webp';

import artilleryIcon from '../assets/brawlstars/classes/icon_class_artillery.png';
import assassinIcon from '../assets/brawlstars/classes/icon_class_assassin.png';
import controllerIcon from '../assets/brawlstars/classes/icon_class_controller.png';
import damageDealerIcon from '../assets/brawlstars/classes/icon_class_damage.png';
import marksmanIcon from '../assets/brawlstars/classes/icon_class_marksmen.png';
import supportIcon from '../assets/brawlstars/classes/icon_class_support.png';
import tankIcon from '../assets/brawlstars/classes/icon_class_tank.png';

import traitDamageIcon from '../assets/brawlstars/traits/icon_trait_super_damage.png';
import traitTimeIcon from '../assets/brawlstars/traits/icon_trait_super_time.png';
import traitHoverIcon from '../assets/brawlstars/traits/icon_trait_walk_over_water.png';
import traitProximityIcon from '../assets/brawlstars/traits/icon_trait_super_proximity.png';
import traitRandomIcon from '../assets/brawlstars/traits/icon_trait_super_random.png';
import traitIncreasedDamageIcon from '../assets/brawlstars/traits/icon_trait_damage_increasing.png';
import traitPowerTokenIcon from '../assets/brawlstars/traits/icon_trait_power_token.png';
import traitSuperHealingIcon from '../assets/brawlstars/traits/icon_trait_super_healing.png';
import traitEnragedIcon from '../assets/brawlstars/traits/icon_trait_hunt.png';
import traitShieldIcon from '../assets/brawlstars/traits/icon_trait_charge_super_shield_damage.png';
import traitDodgeIcon from '../assets/brawlstars/traits/icon_trait_dodge.png';
import traitSpeedIcon from '../assets/brawlstars/traits/icon_trait_speed.png';
import traitMovementIcon from '../assets/brawlstars/traits/icon_trait_move.png';
import traitLifestealIcon from '../assets/brawlstars/traits/icon_trait_lifesteal.png';

import hyperchargeSkinIcon from '../assets/brawlstars/hypercharge_skin.png';
import legendarySkinIcon from '../assets/brawlstars/legendary_skin.png';

import elixir1Icon from '../assets/clashroyale/1elixir.png';
import elixir2Icon from '../assets/clashroyale/2elixir.png';
import elixir3Icon from '../assets/clashroyale/3elixir.png';
import elixir4Icon from '../assets/clashroyale/4elixir.png';
import elixir5Icon from '../assets/clashroyale/5elixir.png';
import elixir6Icon from '../assets/clashroyale/6elixir.png';
import elixir7Icon from '../assets/clashroyale/7elixir.png';
import elixir8Icon from '../assets/clashroyale/8elixir.png';
import elixir9Icon from '../assets/clashroyale/9elixir.png';

import pathAbundanceIcon from '../assets/starrail/paths/Path_Abundance.webp';
import pathDestructionIcon from '../assets/starrail/paths/Path_Destruction.webp';
import pathElationIcon from '../assets/starrail/paths/Path_Elation.webp';
import pathEruditionIcon from '../assets/starrail/paths/Path_Erudition.webp';
import pathHarmonyIcon from '../assets/starrail/paths/Path_Harmony.webp';
import pathNihilityIcon from '../assets/starrail/paths/Path_Nihility.webp';
import pathPreservationIcon from '../assets/starrail/paths/Path_Preservation.webp';
import pathRemembranceIcon from '../assets/starrail/paths/Path_Remembrance.webp';
import pathTheHuntIcon from '../assets/starrail/paths/Path_The_Hunt.webp';

import elementPhysicalIcon from '../assets/starrail/elements/Type_Physical.webp';
import elementFireIcon from '../assets/starrail/elements/Type_Fire.webp';
import elementIceIcon from '../assets/starrail/elements/Type_Ice.webp';
import elementLightningIcon from '../assets/starrail/elements/Type_Lightning.webp';
import elementWindIcon from '../assets/starrail/elements/Type_Wind.webp';
import elementQuantumIcon from '../assets/starrail/elements/Type_Quantum.webp';
import elementImaginaryIcon from '../assets/starrail/elements/Type_Imaginary.webp';

interface CategoryChipProps {
  label: string;
  // Every lookup below is scoped by game (icons, tooltip copy, rarity
  // colors) - two different games can and do reuse the exact same label
  // text (both Brawl Stars and Clash Royale have a "Common"/"Rare" rarity,
  // for instance), so a single flat label->content map would silently
  // leak one game's copy/styling onto another's identically-named value.
  game: GameId;
}

// ── Genshin ──────────────────────────────────────────────────────────────
const GENSHIN_ICONS: Record<string, string> = {
  // Regions
  Mondstadt: mondstadtIcon,
  Liyue: liyueIcon,
  Inazuma: inazumaIcon,
  Sumeru: sumeruIcon,
  Fontaine: fontaineIcon,
  Natlan: natlanIcon,
  'Nod-Krai': nodKraiIcon,
  Snezhnaya: snezhnayaIcon,

  // Elements
  Anemo: anemoIcon,
  Geo: geoIcon,
  Electro: electroIcon,
  Dendro: dendroIcon,
  Hydro: hydroIcon,
  Pyro: pyroIcon,
  Cryo: cryoIcon,

  // Weapons
  Bow: bowIcon,
  Catalyst: catalystIcon,
  Claymore: claymoreIcon,
  Polearm: polearmIcon,
  Sword: swordIcon,
};

// Functional, not lore - this states the puzzle rule the icon represents
// rather than a trivia blurb, matching what a player actually needs to
// solve the cell.
const GENSHIN_DESCRIPTIONS: Record<string, string> = {
  // Regions
  Mondstadt: 'This character must originate from Mondstadt.',
  Liyue: 'This character must originate from Liyue.',
  Inazuma: 'This character must originate from Inazuma.',
  Sumeru: 'This character must originate from Sumeru.',
  Fontaine: 'This character must originate from Fontaine.',
  Natlan: 'This character must originate from Natlan.',
  'Nod-Krai': 'This character must originate from Nod-Krai.',
  Snezhnaya: 'This character must originate from Snezhnaya.',

  // Elements
  Anemo: 'This character wields the power of Anemo.',
  Geo: 'This character wields the power of Geo.',
  Electro: 'This character wields the power of Electro.',
  Dendro: 'This character wields the power of Dendro.',
  Hydro: 'This character wields the power of Hydro.',
  Pyro: 'This character wields the power of Pyro.',
  Cryo: 'This character wields the power of Cryo.',

  // Weapons
  Bow: 'This character uses a Bow.',
  Catalyst: 'This character uses a Catalyst.',
  Claymore: 'This character uses a Claymore.',
  Polearm: 'This character uses a Polearm.',
  Sword: 'This character uses a Sword.',

  // Model and rarity render as the plain-text fallback pill, not an icon
  // (see the final return below) - same map, just consumed from that
  // branch instead of the icon one.
  'Short Female': 'This character has a Short Female model.',
  'Medium Female': 'This character has a Medium Female model.',
  'Tall Female': 'This character has a Tall Female model.',
  'Medium Male': 'This character has a Medium Male model.',
  'Tall Male': 'This character has a Tall Male model.',
  '4-Star': 'This character is a 4-star character.',
  '5-Star': 'This character is a 5-star character.',
};

// Release version has no fixed set of values (a new one ships every patch),
// so unlike the maps above this can't be a lookup map - it's a template
// applied to any label shaped like a version number. Two shapes exist in
// real data: numeric ("1.0".."5.8", "7.0") and, since the 6.0-era rename,
// "Luna <roman numeral>" ("Luna I".."Luna VIII" so far).
const RELEASE_VERSION_PATTERNS = [/^\d+\.\d+$/, /^Luna [IVXLCDM]+$/];

function releaseVersionDescription(label: string): string | undefined {
  return RELEASE_VERSION_PATTERNS.some((pattern) => pattern.test(label))
    ? `This character was released in Version ${label}.`
    : undefined;
}

// ── Brawl Stars ──────────────────────────────────────────────────────────
const BRAWLSTARS_ICONS: Record<string, string> = {
  // Classes
  Artillery: artilleryIcon,
  Assassin: assassinIcon,
  Controller: controllerIcon,
  'Damage Dealer': damageDealerIcon,
  Marksman: marksmanIcon,
  Support: supportIcon,
  Tank: tankIcon,

  // Traits
  Damage: traitDamageIcon,
  Time: traitTimeIcon,
  Hover: traitHoverIcon,
  Proximity: traitProximityIcon,
  Random: traitRandomIcon,
  'Increased Damage': traitIncreasedDamageIcon,
  'Power Token': traitPowerTokenIcon,
  'Super Healing': traitSuperHealingIcon,
  Enraged: traitEnragedIcon,
  Shield: traitShieldIcon,
  Dodge: traitDodgeIcon,
  Speed: traitSpeedIcon,
  Movement: traitMovementIcon,
  Lifesteal: traitLifestealIcon,

  // Tags (see BRAWLSTARS_DESCRIPTIONS below) - unlike traits/classes above,
  // these are full-color self-contained badges (own built-in shadow), not
  // black line art, so they're left out of INVERT_IN_DARK.
  'Has Hypercharge Skin': hyperchargeSkinIcon,
  'Has Legendary Skin': legendarySkinIcon,
};

// Unlike the Genshin icons above (each a self-contained badge with its own
// baked-in circular backdrop, legible on any background), the brawler class
// icons are plain black line art on a transparent background - invisible
// against the chip's dark:bg-transparent wrapper. Inverting them in dark
// mode only (black -> white) keeps the wrapper's existing background
// classes untouched and works for every class icon without needing a
// second badge image per icon.
const INVERT_IN_DARK = new Set([
  'Artillery', 'Assassin', 'Controller', 'Damage Dealer', 'Marksman', 'Support', 'Tank',
  'Damage', 'Time', 'Hover', 'Proximity', 'Random', 'Increased Damage', 'Power Token',
  'Super Healing', 'Enraged', 'Shield', 'Dodge', 'Speed', 'Movement', 'Lifesteal',
]);

// In-game explanation of what each trait actually does, shown in a
// click-to-reveal tooltip on the trait's icon - the trait icons alone
// aren't enough for a player to recall the mechanic behind them.
const BRAWLSTARS_DESCRIPTIONS: Record<string, string> = {
  // Traits
  Damage: 'This brawler charges its super by taking damage.',
  Time: "This brawler's super charges automatically over time.",
  Hover: 'This brawler can move over water.',
  Proximity: 'This brawler charges its super by staying near allies or enemies.',
  Random: 'This brawler gets a random super each time its super charges.',
  'Increased Damage': "This brawler's damage increases the longer it goes without attacking.",
  'Power Token': 'This brawler collects tokens by hitting enemies, which can be spent on upgrades.',
  'Super Healing': 'This brawler charges its super by healing.',
  Enraged: 'This brawler moves faster when a low-HP enemy is nearby and visible.',
  Shield: 'This brawler charges its super when its shield takes damage.',
  Dodge: 'This brawler charges its super by dodging nearby enemy projectiles.',
  Speed: 'This brawler moves faster the longer it keeps moving.',
  Movement: 'This brawler charges its super by moving.',
  Lifesteal: 'This brawler heals for a portion of the damage it deals.',

  // Classes - same reasoning as region above: states the puzzle rule the
  // icon represents (Brawl Stars' own in-game class label) rather than trivia.
  Artillery: 'This brawler is classified as an Artillery.',
  Assassin: 'This brawler is classified as an Assassin.',
  Controller: 'This brawler is classified as a Controller.',
  'Damage Dealer': 'This brawler is classified as a Damage Dealer.',
  Marksman: 'This brawler is classified as a Marksman.',
  Support: 'This brawler is classified as a Support.',
  Tank: 'This brawler is classified as a Tank.',

  // Rarity - applied to the plain-text fallback pill (no dedicated rarity
  // icon asset exists, unlike class/trait). Common is left out on purpose:
  // the real game gives it no special color either, so it keeps the
  // default gray, same as the fallback pill's own default. Ultra Legendary
  // isn't a flat color in-game and is handled separately below.
  Common: "This brawler's rarity is Common.",
  Rare: "This brawler's rarity is Rare.",
  'Super Rare': "This brawler's rarity is Super Rare.",
  Epic: "This brawler's rarity is Epic.",
  Mythic: "This brawler's rarity is Mythic.",
  Legendary: "This brawler's rarity is Legendary.",
  'Ultra Legendary': "This brawler's rarity is Ultra Legendary.",

  // Tags with no bespoke chip treatment of their own (unlike Former
  // Chromatic below) fall through to the plain-text pill, same as rarity -
  // this is just their tooltip copy.
  'Has Wallbreak': 'This brawler can break walls.',
  'Has Hypercharge Skin': 'This brawler has a Hypercharge skin.',
  'Has Legendary Skin': 'This brawler has a Legendary skin.',
};

const BRAWLSTARS_RARITY_STYLES: Record<string, string> = {
  Rare: 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-400',
  'Super Rare': 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400',
  Epic: 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400',
  Mythic: 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400',
  Legendary: 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
};

// Same reasoning as release version above, but for Brawl Stars' release_year
// (a bare 4-digit year, e.g. "2017") - a new value ships every year, so this
// is a pattern rather than a lookup map.
const RELEASE_YEAR_PATTERN = /^\d{4}$/;

function releaseYearDescription(label: string): string | undefined {
  return RELEASE_YEAR_PATTERN.test(label)
    ? `This brawler was released in ${label}.`
    : undefined;
}

const TRAIT_LABELS = new Set([
  'Damage', 'Time', 'Hover', 'Proximity', 'Random', 'Increased Damage', 'Power Token',
  'Super Healing', 'Enraged', 'Shield', 'Dodge', 'Speed', 'Movement', 'Lifesteal',
]);

// ── Clash Royale ─────────────────────────────────────────────────────────
// Elixir cost renders as an icon (the real in-game droplet-with-number
// badge) rather than the plain-text fallback pill every other scalar
// category (rarity, card type) uses - unlike a bare "3", the badge is
// immediately legible as "elixir cost" on its own.
const CLASHROYALE_ICONS: Record<string, string> = {
  '1': elixir1Icon,
  '2': elixir2Icon,
  '3': elixir3Icon,
  '4': elixir4Icon,
  '5': elixir5Icon,
  '6': elixir6Icon,
  '7': elixir7Icon,
  '8': elixir8Icon,
  '9': elixir9Icon,
};

const CLASHROYALE_ELIXIR_DESCRIPTIONS: Record<string, string> = {
  '1': 'This card costs 1 Elixir.',
  '2': 'This card costs 2 Elixir.',
  '3': 'This card costs 3 Elixir.',
  '4': 'This card costs 4 Elixir.',
  '5': 'This card costs 5 Elixir.',
  '6': 'This card costs 6 Elixir.',
  '7': 'This card costs 7 Elixir.',
  '8': 'This card costs 8 Elixir.',
  '9': 'This card costs 9 Elixir.',
};

const CLASHROYALE_DESCRIPTIONS: Record<string, string> = {
  ...CLASHROYALE_ELIXIR_DESCRIPTIONS,

  // Rarity - same "plain-text fallback pill, colored per real in-game
  // rarity" treatment as Brawl Stars above. Unlike Brawl Stars, Common gets
  // its own color here too (a light blue tint) rather than falling back to
  // the generic gray pill. Legendary is handled as its own bespoke branch
  // below (a gradient-text treatment, not a flat color), same as Ultra
  // Legendary/Former Chromatic.
  Common: "This card's rarity is Common.",
  Rare: "This card's rarity is Rare.",
  Epic: "This card's rarity is Epic.",
  Legendary: "This card's rarity is Legendary.",
  Champion: "This card's rarity is Champion.",

  // Card type
  Troop: 'This card is classified as a Troop.',
  Building: 'This card is classified as a Building.',
  Spell: 'This card is classified as a Spell.',

  // Form - see normalize.py's map_card for how Evolution/Hero become their
  // own independently-guessable entities rather than a tag on the base card.
  Base: "This must be a card's base form, not an Evolution or Hero variant.",
  Evolution: 'This card must be an Evolution.',
  Hero: 'This card must be a Hero form.',
};

// Legendary isn't here - it gets its own gradient-text branch below, same
// treatment as Brawl Stars' Ultra Legendary/Former Chromatic.
const CLASHROYALE_RARITY_STYLES: Record<string, string> = {
  Common: 'border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400',
  Rare: 'border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400',
  Epic: 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400',
  Champion: 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
};

// ── Honkai: Star Rail ────────────────────────────────────────────────────
const STARRAIL_ICONS: Record<string, string> = {
  // Paths - "The Hunt" (not "Hunt" alone) is the real in-game path name,
  // resolved from the raw data itself (AvatarBaseType.json's FirstWordText),
  // not a guess - see ingestion/starrail/normalize.py.
  Abundance: pathAbundanceIcon,
  Destruction: pathDestructionIcon,
  Elation: pathElationIcon,
  Erudition: pathEruditionIcon,
  Harmony: pathHarmonyIcon,
  Nihility: pathNihilityIcon,
  Preservation: pathPreservationIcon,
  Remembrance: pathRemembranceIcon,
  'The Hunt': pathTheHuntIcon,

  // Elements
  Physical: elementPhysicalIcon,
  Fire: elementFireIcon,
  Ice: elementIceIcon,
  Lightning: elementLightningIcon,
  Wind: elementWindIcon,
  Quantum: elementQuantumIcon,
  Imaginary: elementImaginaryIcon,
};

const STARRAIL_DESCRIPTIONS: Record<string, string> = {
  // Paths
  Abundance: 'This character follows the Path of Abundance.',
  Destruction: 'This character follows the Path of Destruction.',
  Elation: 'This character follows the Path of Elation.',
  Erudition: 'This character follows the Path of Erudition.',
  Harmony: 'This character follows the Path of Harmony.',
  Nihility: 'This character follows the Path of Nihility.',
  Preservation: 'This character follows the Path of Preservation.',
  Remembrance: 'This character follows the Path of Remembrance.',
  'The Hunt': 'This character follows the Path of The Hunt.',

  // Elements (Combat Types)
  Physical: 'This character deals Physical DMG.',
  Fire: 'This character deals Fire DMG.',
  Ice: 'This character deals Ice DMG.',
  Lightning: 'This character deals Lightning DMG.',
  Wind: 'This character deals Wind DMG.',
  Quantum: 'This character deals Quantum DMG.',
  Imaginary: 'This character deals Imaginary DMG.',

  // Rarity renders as the plain-text fallback pill (see the final return
  // below), same "4-Star"/"5-Star" treatment as Genshin - no dedicated
  // color, same underlying concept (a star count, not an in-game rarity
  // name/color the way Brawl Stars/Clash Royale have).
  '4-Star': 'This character is a 4-star character.',
  '5-Star': 'This character is a 5-star character.',
};

// Path icons are white/light line art baked for a dark backdrop - legible
// against the chip's dark:bg-transparent background, but nearly invisible
// against its light-mode bg-gray-100 (too subtle a value difference to
// read at this size). Element icons don't have this problem (they carry
// their own color), so this is scoped to paths only, not all STARRAIL_ICONS.
const STARRAIL_PATH_LABELS = new Set([
  'Abundance', 'Destruction', 'Elation', 'Erudition', 'Harmony',
  'Nihility', 'Preservation', 'Remembrance', 'The Hunt',
]);

// ── Per-game lookup tables ───────────────────────────────────────────────
const ICONS_BY_GAME: Record<GameId, Record<string, string>> = {
  genshin: GENSHIN_ICONS,
  brawlstars: BRAWLSTARS_ICONS,
  clashroyale: CLASHROYALE_ICONS,
  starrail: STARRAIL_ICONS,
};

const DESCRIPTIONS_BY_GAME: Record<GameId, Record<string, string>> = {
  genshin: GENSHIN_DESCRIPTIONS,
  brawlstars: BRAWLSTARS_DESCRIPTIONS,
  clashroyale: CLASHROYALE_DESCRIPTIONS,
  starrail: STARRAIL_DESCRIPTIONS,
};

const RARITY_STYLES_BY_GAME: Record<GameId, Record<string, string>> = {
  genshin: {},
  brawlstars: BRAWLSTARS_RARITY_STYLES,
  clashroyale: CLASHROYALE_RARITY_STYLES,
  // Same reasoning as Genshin's empty map above - "4-Star"/"5-Star" is a
  // star count, not an in-game rarity name/color, so it stays the default
  // plain pill.
  starrail: {},
};

function patternDescription(game: GameId, label: string): string | undefined {
  if (game === 'genshin') return releaseVersionDescription(label);
  if (game === 'brawlstars') return releaseYearDescription(label);
  return undefined;
}

// GuessInput's row/col header shows the same category labels as this chip
// but as plain text, with no icon for context - a bare "Damage" or a bare
// "5" reads as ambiguous there in a way "Legendary" or "Tank" doesn't.
// Category label formatting is otherwise entirely this file's concern
// (icons, colors, etc.), so this keeps GuessInput from needing its own
// per-game formatting rules - it just renders whatever this returns.
export function formatCategoryLabel(label: string, game: GameId): string {
  if (game === 'brawlstars' && TRAIT_LABELS.has(label)) return `${label} Trait`;
  if (game === 'clashroyale' && label in CLASHROYALE_ELIXIR_DESCRIPTIONS) return `${label} Elixir`;
  // "Base" alone reads as ambiguous next to "Evolution"/"Hero" - those are
  // both clearly card variants, but a bare "Base" doesn't say "form" the
  // way they imply it by contrast.
  if (game === 'clashroyale' && label === 'Base') return 'Base Form';
  return label;
}

export default function CategoryChip({ label, game }: CategoryChipProps) {
  const icon = ICONS_BY_GAME[game][label];
  // On a slow connection these (up to 6 per puzzle, all requested at once)
  // can take a moment - previously the box just stayed blank with no
  // feedback. A pulsing placeholder fills the gap and unmounts once the
  // icon actually loads, so the "blend into the page" dark-mode background
  // above is still what's left behind afterward, not a permanent tile.
  const [imageReady, setImageReady] = useState(false);

  if (icon) {
    const tooltipDescription = DESCRIPTIONS_BY_GAME[game][label];
    const iconBox = (
      <div className="relative w-(--grid-chip) h-(--grid-chip) bg-gray-100 dark:bg-transparent flex items-center justify-center">
        {!imageReady && (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse"
          />
        )}
        <img
          src={icon}
          alt={label}
          title={label}
          onLoad={() => setImageReady(true)}
          onError={() => setImageReady(true)}
          className={`w-(--grid-chip-img) h-(--grid-chip-img) object-contain transition-opacity duration-300 ${
            INVERT_IN_DARK.has(label) ? 'dark:invert' : ''
          } ${
            // Opposite direction from INVERT_IN_DARK above: these icons are
            // white line art, invisible against the chip's light-mode
            // bg-gray-100 - inverted (white -> black) in light mode only,
            // then un-inverted back to white for dark mode, where they're
            // already legible against the transparent/dark background.
            game === 'starrail' && STARRAIL_PATH_LABELS.has(label) ? 'invert dark:invert-0' : ''
          } ${imageReady ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
    );

    return (
      <div className="flex flex-col items-center gap-1.5">
        {tooltipDescription ? (
          <ClickTooltip heading={formatCategoryLabel(label, game)} description={tooltipDescription}>
            {iconBox}
          </ClickTooltip>
        ) : (
          iconBox
        )}
      </div>
    );
  }

  if (game === 'brawlstars' && label === 'Ultra Legendary') {
    return (
      <ClickTooltip heading={label} description={BRAWLSTARS_DESCRIPTIONS[label]}>
        <div className="inline-flex items-center justify-center text-center px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl border font-bold text-xs sm:text-sm leading-tight max-w-full border-lime-300 dark:border-lime-700 bg-lime-50 dark:bg-lime-500/15">
          {/* Same "gradient text, plain pill" treatment as Former Chromatic
              below rather than a distinct look of its own - a rainbow-ish
              3-stop gradient (not Former Chromatic's purple-to-gold) since
              this is a different rarity, not the one Chromatic became. Lime
              border/tint (not a neutral gray) so the pill itself still
              reads as distinct from an ordinary rarity, not just the text. */}
          <span className="bg-gradient-to-r from-pink-500 via-amber-400 to-indigo-500 bg-clip-text text-transparent">
            {label}
          </span>
        </div>
      </ClickTooltip>
    );
  }

  if (game === 'brawlstars' && label === 'Former Chromatic') {
    return (
      <ClickTooltip heading={label} description="This brawler's rarity used to be Chromatic.">
        <div className="inline-flex flex-wrap items-center justify-center gap-x-1 text-center px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl border font-bold text-xs sm:text-sm leading-tight max-w-full border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-500/15">
          <span className="text-orange-700 dark:text-orange-400">Former</span>
          {/* Chromatic's own in-game name treatment: a purple-to-gold text
              gradient, echoing the rarity it replaced (Epic-through-Legendary)
              rather than a flat color like every other rarity pill. */}
          <span className="bg-gradient-to-r from-purple-500 to-amber-400 bg-clip-text text-transparent">
            Chromatic
          </span>
        </div>
      </ClickTooltip>
    );
  }

  if (game === 'clashroyale' && label === 'Legendary') {
    return (
      <ClickTooltip heading={label} description={CLASHROYALE_DESCRIPTIONS[label]}>
        <div className="inline-flex items-center justify-center text-center px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl border font-bold text-xs sm:text-sm leading-tight max-w-full border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-500/15">
          {/* Legendary cards have a shimmering rainbow-ish frame in-game,
              not a flat color - a light green-to-pink text gradient on a
              teal-tinted pill approximates that instead of picking one hue. */}
          <span className="bg-gradient-to-r from-green-300 to-pink-400 bg-clip-text text-transparent">
            {label}
          </span>
        </div>
      </ClickTooltip>
    );
  }

  if (game === 'clashroyale' && label === 'Evolution') {
    return (
      <ClickTooltip heading={label} description={CLASHROYALE_DESCRIPTIONS[label]}>
        <div className="inline-flex items-center justify-center text-center px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl border font-bold text-xs sm:text-sm leading-tight max-w-full border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-500/15">
          {/* Light-purple-to-purple text gradient (not white - bg-clip-text
              on a light pill background made a white stop unreadable in
              light mode) - echoes the purple glow an Evolution's own
              in-game unlock animation has. */}
          <span className="bg-gradient-to-r from-purple-400 to-purple-700 bg-clip-text text-transparent">
            {label}
          </span>
        </div>
      </ClickTooltip>
    );
  }

  if (game === 'clashroyale' && label === 'Hero') {
    return (
      <ClickTooltip heading={label} description={CLASHROYALE_DESCRIPTIONS[label]}>
        <div className="inline-flex items-center justify-center text-center px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl border font-bold text-xs sm:text-sm leading-tight max-w-full border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-500/15">
          {/* Same light-to-color treatment as Evolution above, yellow-to-gold
              instead of purple - Hero (Tower Troop) cards get a golden
              tower-defense frame in-game. */}
          <span className="bg-gradient-to-r from-yellow-400 to-amber-600 bg-clip-text text-transparent">
            {label}
          </span>
        </div>
      </ClickTooltip>
    );
  }

  const rarityClass = RARITY_STYLES_BY_GAME[game][label];
  const pill = (
    <div
      className={`inline-flex items-center justify-center text-center px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl border font-bold text-xs sm:text-sm leading-tight max-w-full ${
        rarityClass ?? 'border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100'
      }`}
    >
      {formatCategoryLabel(label, game)}
    </div>
  );

  const pillDescription = DESCRIPTIONS_BY_GAME[game][label] ?? patternDescription(game, label);
  if (pillDescription) {
    return (
      <ClickTooltip heading={formatCategoryLabel(label, game)} description={pillDescription}>
        {pill}
      </ClickTooltip>
    );
  }

  return pill;
}
