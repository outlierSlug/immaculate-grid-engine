import { useState } from 'react';
import { GAMES, type GameId } from '../config/games';

export interface HeroImage {
  src: string;
  objectPosition: string;
}

// Picks once per mount, not on every render - each GameCard/game-switch row
// gets a stable image for its lifetime instead of jumping around on
// re-render. Today every game only has one entry in heroImages, so this is
// a no-op; it starts actually rotating the moment a second image is added
// to that game's array in games.ts, with no other code changes needed.
export function useRandomHeroImage(gameId: GameId): HeroImage {
  const [image] = useState<HeroImage>(() => {
    const images = GAMES[gameId].heroImages;
    return images[Math.floor(Math.random() * images.length)];
  });
  return image;
}
