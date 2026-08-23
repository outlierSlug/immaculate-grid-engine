import { useState } from 'react';
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
]);

// Brawl Stars' own rarity colors, applied to the plain-text fallback pill
// below (no dedicated rarity icon asset exists, unlike class/element/weapon)
// - same pill shape, just colored instead of generic gray. Common is left
// out on purpose: the real game gives it no special color either, so it
// keeps the default gray. Ultra Legendary isn't a flat color in-game and is
// handled separately below.
const RARITY_STYLES: Record<string, string> = {
  Rare: 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-400',
  'Super Rare': 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400',
  Epic: 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400',
  Mythic: 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400',
  Legendary: 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
};

// Chunky (not blended) color bands, echoing the diagonal texture stripe
// used elsewhere in the app (see CommunityAnswersModal's pick-rate bar) -
// "pixel" rainbow rather than a smooth gradient blur, closer to Brawl
// Stars' own chunky Ultra Legendary treatment. Same Tailwind 500-step hues
// used everywhere else in this file, just cycled instead of picked once.
const ULTRA_LEGENDARY_BACKGROUND =
  'repeating-linear-gradient(135deg, #ef4444 0px, #ef4444 6px, #f97316 6px, #f97316 12px, ' +
  '#eab308 12px, #eab308 18px, #22c55e 18px, #22c55e 24px, #3b82f6 24px, #3b82f6 30px, ' +
  '#a855f7 30px, #a855f7 36px)';

export default function CategoryChip({ label }: CategoryChipProps) {
  const icon = ICONS[label];
  // On a slow connection these (up to 6 per puzzle, all requested at once)
  // can take a moment - previously the box just stayed blank with no
  // feedback. A pulsing placeholder fills the gap and unmounts once the
  // icon actually loads, so the "blend into the page" dark-mode background
  // above is still what's left behind afterward, not a permanent tile.
  const [imageReady, setImageReady] = useState(false);

  if (icon) {
    return (
      <div className="flex flex-col items-center gap-1.5">
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
        {/* <span className="text-xs font-medium text-gray-600">{label}</span> */}
      </div>
    );
  }

  if (label === 'Ultra Legendary') {
    return (
      <div
        className="inline-flex items-center justify-center text-center px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-white font-bold text-xs sm:text-sm leading-tight max-w-full [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]"
        style={{ backgroundImage: ULTRA_LEGENDARY_BACKGROUND }}
      >
        {label}
      </div>
    );
  }

  const rarityClass = RARITY_STYLES[label];

  return (
    <div
      className={`inline-flex items-center justify-center text-center px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl border font-bold text-xs sm:text-sm leading-tight max-w-full ${
        rarityClass ?? 'border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100'
      }`}
    >
      {label}
    </div>
  );
}