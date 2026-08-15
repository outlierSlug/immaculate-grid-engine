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
};

// const REGION_NAMES = new Set([
//   'Mondstadt', 'Liyue', 'Inazuma', 'Sumeru',
//   'Fontaine', 'Natlan', 'Nod-Krai', 'Snezhnaya',
// ]);

// const WEAPON_NAMES = new Set([
//   'Bow',
//   'Catalyst',
//   'Claymore',
//   'Polearm',
//   'Sword',
// ]);

// const ELEMENT_RING: Record<string, string> = {
//   Pyro: 'border-red-300',
//   Hydro: 'border-blue-300',
//   Anemo: 'border-teal-300',
//   Electro: 'border-purple-300',
//   Dendro: 'border-green-300',
//   Cryo: 'border-cyan-300',
//   Geo: 'border-amber-300',
// };

// function ringClassFor(label: string): string {
//   // if (ELEMENT_RING[label]) return ELEMENT_RING[label];
//   // if (REGION_NAMES.has(label)) return 'border-taupe-300';
//   return 'border-taupe-300';
// }

export default function CategoryChip({ label }: CategoryChipProps) {
  const icon = ICONS[label];

  if (icon) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <div
          className={`w-13 h-13 sm:w-20 sm:h-20 bg-gray-100 flex items-center justify-center`}
        >
          <img src={icon} alt={label} title={label} className="w-10 h-10 sm:w-16 sm:h-16 object-contain" />
        </div>
        {/* <span className="text-xs font-medium text-gray-600">{label}</span> */}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center justify-center text-center px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl border border-gray-300 bg-gray-100 text-gray-800 font-bold text-xs sm:text-sm leading-tight max-w-full">
      {label}
    </div>
  );
}