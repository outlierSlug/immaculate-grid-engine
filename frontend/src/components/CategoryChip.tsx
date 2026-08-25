import { useState } from 'react';
import ClickTooltip from './ClickTooltip';
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

interface CategoryChipProps {
  label: string;
}

// Merged lookup: region and element both render as icon medallions,
// sourced from separate asset folders but treated identically here.
const ICONS: Record<string, string> = {
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

  // Brawler classes
  Artillery: artilleryIcon,
  Assassin: assassinIcon,
  Controller: controllerIcon,
  'Damage Dealer': damageDealerIcon,
  Marksman: marksmanIcon,
  Support: supportIcon,
  Tank: tankIcon,

  // Brawler traits
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

  // Brawler tags (see TAG_DESCRIPTIONS below) - unlike traits/classes above,
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
// aren't enough for a player to recall the mechanic behind them. Every
// other icon-backed category (region, brawler class, element, weapon) gets
// the same tooltip treatment below, via its own *_DESCRIPTIONS map - see
// tooltipDescription's lookup chain further down for the full list.
const TRAIT_DESCRIPTIONS: Record<string, string> = {
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
};

// Functional, not lore - this states the puzzle rule the icon represents
// rather than a trivia blurb, matching what a player actually needs to
// solve the cell (same reasoning as the trait descriptions above).
const REGION_DESCRIPTIONS: Record<string, string> = {
  Mondstadt: 'This character must originate from Mondstadt.',
  Liyue: 'This character must originate from Liyue.',
  Inazuma: 'This character must originate from Inazuma.',
  Sumeru: 'This character must originate from Sumeru.',
  Fontaine: 'This character must originate from Fontaine.',
  Natlan: 'This character must originate from Natlan.',
  'Nod-Krai': 'This character must originate from Nod-Krai.',
  Snezhnaya: 'This character must originate from Snezhnaya.',
};

// Same reasoning as region: states the puzzle rule the icon represents
// (Brawl Stars' own in-game class label) rather than trivia.
const CLASS_DESCRIPTIONS: Record<string, string> = {
  Artillery: 'This brawler is classified as an Artillery.',
  Assassin: 'This brawler is classified as an Assassin.',
  Controller: 'This brawler is classified as a Controller.',
  'Damage Dealer': 'This brawler is classified as a Damage Dealer.',
  Marksman: 'This brawler is classified as a Marksman.',
  Support: 'This brawler is classified as a Support.',
  Tank: 'This brawler is classified as a Tank.',
};

const ELEMENT_DESCRIPTIONS: Record<string, string> = {
  Anemo: 'This character wields the power of Anemo.',
  Geo: 'This character wields the power of Geo.',
  Electro: 'This character wields the power of Electro.',
  Dendro: 'This character wields the power of Dendro.',
  Hydro: 'This character wields the power of Hydro.',
  Pyro: 'This character wields the power of Pyro.',
  Cryo: 'This character wields the power of Cryo.',
};

const WEAPON_DESCRIPTIONS: Record<string, string> = {
  Bow: 'This character uses a Bow.',
  Catalyst: 'This character uses a Catalyst.',
  Claymore: 'This character uses a Claymore.',
  Polearm: 'This character uses a Polearm.',
  Sword: 'This character uses a Sword.',
};

// Model and rarity render as the plain-text fallback pill, not an icon
// (see the final return below) - same *_DESCRIPTIONS lookup pattern still
// applies, it's just consumed from that branch instead of the icon one.
const MODEL_DESCRIPTIONS: Record<string, string> = {
  'Short Female': 'This character has a Short Female model.',
  'Medium Female': 'This character has a Medium Female model.',
  'Tall Female': 'This character has a Tall Female model.',
  'Medium Male': 'This character has a Medium Male model.',
  'Tall Male': 'This character has a Tall Male model.',
};

const RARITY_DESCRIPTIONS: Record<string, string> = {
  '4-Star': 'This character is a 4-star character.',
  '5-Star': 'This character is a 5-star character.',
};

// Release version has no fixed set of values (a new one ships every patch),
// so unlike the other categories this can't be a lookup map - it's a
// template applied to any label shaped like a version number. Two shapes
// exist in real data: numeric ("1.0".."5.8", "7.0") and, since the 6.0-era
// rename, "Luna <roman numeral>" ("Luna I".."Luna VIII" so far). Neither
// pattern collides with anything else that hits this same fallback pill
// (rarity is "5-Star", model is "Tall Male", etc).
const RELEASE_VERSION_PATTERNS = [/^\d+\.\d+$/, /^Luna [IVXLCDM]+$/];

function releaseVersionDescription(label: string): string | undefined {
  return RELEASE_VERSION_PATTERNS.some((pattern) => pattern.test(label))
    ? `This character was released in Version ${label}.`
    : undefined;
}

// Same reasoning as release version above, but for Brawl Stars' release_year
// (a bare 4-digit year, e.g. "2017") - a new value ships every year, so this
// is a pattern rather than a lookup map. Doesn't collide with anything else
// hitting this same fallback pill (no other label here is 4 bare digits).
const RELEASE_YEAR_PATTERN = /^\d{4}$/;

function releaseYearDescription(label: string): string | undefined {
  return RELEASE_YEAR_PATTERN.test(label)
    ? `This brawler was released in ${label}.`
    : undefined;
}

const TRAIT_LABELS = new Set(Object.keys(TRAIT_DESCRIPTIONS));

// GuessInput's row/col header shows the same category labels as this chip
// but as plain text, with no icon for context - a bare "Damage" or "Time"
// reads as ambiguous there in a way "Legendary" or "Tank" doesn't. Category
// label formatting is otherwise entirely this file's concern (icons,
// colors, etc.), so this keeps GuessInput from needing to know which labels
// are traits - it just renders whatever this returns.
export function formatCategoryLabel(label: string): string {
  return TRAIT_LABELS.has(label) ? `${label} Trait` : label;
}

// Brawl Stars' own rarity colors, applied to the plain-text fallback pill
// below (no dedicated rarity icon asset exists, unlike class/element/weapon)
// - same pill shape, just colored instead of generic gray. Common is left
// out on purpose: the real game gives it no special color either, so it
// keeps the default gray. Ultra Legendary isn't a flat color in-game and is
// handled separately below.
const BS_RARITY_DESCRIPTIONS: Record<string, string> = {
  Common: "This brawler's rarity is Common.",
  Rare: "This brawler's rarity is Rare.",
  'Super Rare': "This brawler's rarity is Super Rare.",
  Epic: "This brawler's rarity is Epic.",
  Mythic: "This brawler's rarity is Mythic.",
  Legendary: "This brawler's rarity is Legendary.",
  'Ultra Legendary': "This brawler's rarity is Ultra Legendary.",
};

// Tags with no bespoke chip treatment of their own (unlike Former Chromatic
// below) fall through to the plain-text pill, same as model/rarity - this
// is just their tooltip copy.
const TAG_DESCRIPTIONS: Record<string, string> = {
  'Has Wallbreak': "This brawler can break walls.",
  'Has Hypercharge Skin': 'This brawler has a Hypercharge skin.',
  'Has Legendary Skin': 'This brawler has a Legendary skin.',
};

const RARITY_STYLES: Record<string, string> = {
  Rare: 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-400',
  'Super Rare': 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400',
  Epic: 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400',
  Mythic: 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400',
  Legendary: 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
};

export default function CategoryChip({ label }: CategoryChipProps) {
  const icon = ICONS[label];
  // On a slow connection these (up to 6 per puzzle, all requested at once)
  // can take a moment - previously the box just stayed blank with no
  // feedback. A pulsing placeholder fills the gap and unmounts once the
  // icon actually loads, so the "blend into the page" dark-mode background
  // above is still what's left behind afterward, not a permanent tile.
  const [imageReady, setImageReady] = useState(false);

  if (icon) {
    const tooltipDescription =
      TRAIT_DESCRIPTIONS[label] ??
      REGION_DESCRIPTIONS[label] ??
      CLASS_DESCRIPTIONS[label] ??
      ELEMENT_DESCRIPTIONS[label] ??
      WEAPON_DESCRIPTIONS[label] ??
      TAG_DESCRIPTIONS[label];
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
          } ${imageReady ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
    );

    return (
      <div className="flex flex-col items-center gap-1.5">
        {tooltipDescription ? (
          <ClickTooltip heading={formatCategoryLabel(label)} description={tooltipDescription}>
            {iconBox}
          </ClickTooltip>
        ) : (
          iconBox
        )}
      </div>
    );
  }

  if (label === 'Ultra Legendary') {
    return (
      <ClickTooltip heading={label} description={BS_RARITY_DESCRIPTIONS[label]}>
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

  if (label === 'Former Chromatic') {
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

  const rarityClass = RARITY_STYLES[label];
  const pill = (
    <div
      className={`inline-flex items-center justify-center text-center px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl border font-bold text-xs sm:text-sm leading-tight max-w-full ${
        rarityClass ?? 'border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100'
      }`}
    >
      {label}
    </div>
  );

  const pillDescription =
    MODEL_DESCRIPTIONS[label] ??
    RARITY_DESCRIPTIONS[label] ??
    BS_RARITY_DESCRIPTIONS[label] ??
    TAG_DESCRIPTIONS[label] ??
    releaseVersionDescription(label) ??
    releaseYearDescription(label);
  if (pillDescription) {
    return (
      <ClickTooltip heading={label} description={pillDescription}>
        {pill}
      </ClickTooltip>
    );
  }

  return pill;
}