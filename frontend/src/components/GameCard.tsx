import { Link } from 'react-router-dom';
import type { GameId } from '../config/games';
import { useRandomHeroImage } from '../hooks/useRandomHeroImage';

interface GameCardProps {
  gameId: GameId;
  index: number;
  logoImage: string;
  logoAlt: string;
  // Both logos render at the SAME box height via object-cover (not
  // object-contain) into a per-game aspect box, cropping straight to the
  // wordmark band - object-contain looked misaligned because the two source
  // logos carry wildly different amounts of internal transparent padding
  // (Logo_ENG.png is a padded 512x512 square; BS_EN.png is tightly
  // cropped), so matching box heights alone still left the visible ink at
  // different sizes and different vertical positions. logoAspectClass /
  // logoObjectPosition are literal Tailwind/CSS values tuned per game -
  // see games.ts.
  accentRingClass: string;
  logoAspectClass: string;
  logoObjectPosition: string;
}

export default function GameCard({
  gameId,
  index,
  logoImage,
  logoAlt,
  accentRingClass,
  logoAspectClass,
  logoObjectPosition,
}: GameCardProps) {
  const heroImage = useRandomHeroImage(gameId);

  return (
    <Link
      to={`/${gameId}`}
      className={`group relative block aspect-4/3 rounded-2xl overflow-hidden shadow-md ring-1 ring-black/5 dark:ring-white/10 hover:ring-2 hover:shadow-xl hover:-translate-y-0.5 transition ${accentRingClass}`}
    >
      <img
        src={heroImage.src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover transition duration-300 group-hover:scale-105"
        style={{ objectPosition: heroImage.objectPosition }}
      />
      {/* Scrim for logo/text legibility only - deliberately not tinted per
          game, so the official art carries its own color identity. */}
      <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/5 to-transparent" />

      <span className="absolute top-4 left-4 font-mono text-xs font-bold text-white tabular-nums">
        {String(index).padStart(2, '0')}
      </span>

      <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between gap-3">
        <div className={`h-10 sm:h-12 ${logoAspectClass} overflow-hidden shrink-0`}>
          <img
            src={logoImage}
            alt={logoAlt}
            className="w-full h-full object-cover drop-shadow-lg"
            style={{ objectPosition: logoObjectPosition }}
          />
        </div>
        {/* Arrow badge is always visible - a hover-only reveal never shows up
            on touch devices, which have no hover state at all. The "Play"
            label still only reveals on hover, via a smooth max-width
            expansion, so desktop keeps the nicer animated affordance. */}
        <span className="flex items-center gap-1.5 text-white text-sm font-semibold shrink-0">
          <span className="max-w-0 group-hover:max-w-10 overflow-hidden whitespace-nowrap transition-[max-width] duration-300 ease-out">
            Play
          </span>
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white/20 ring-1 ring-white/40 backdrop-blur-sm transition duration-300 group-hover:bg-white/30 group-hover:translate-x-0.5">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </span>
        </span>
      </div>
    </Link>
  );
}
