export const GAMES = {
  genshin: {
    id: 'genshin',
    label: 'Genshin Impact',
  },
  brawlstars: {
    id: 'brawlstars',
    label: 'Brawl Stars',
  },
} as const;

export type GameId = keyof typeof GAMES;

export function isValidGameId(game: string | undefined): game is GameId {
  return game !== undefined && game in GAMES;
}