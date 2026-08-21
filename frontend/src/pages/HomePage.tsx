import { GAMES } from '../config/games';
import GameCard from '../components/GameCard';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex flex-col items-center px-6 py-16 sm:py-20">
      <div className="text-center max-w-lg mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
          Immaculate Grid
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg">
          Fill a 3x3 grid where every pick has to satisfy both its row and column category. A new puzzle every day, or play unlimited.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-3xl">
        {Object.values(GAMES).map((game, index) => (
          <GameCard
            key={game.id}
            gameId={game.id}
            index={index + 1}
            logoImage={game.logoImage}
            logoAlt={game.label}
            logoAspectClass={game.logoAspectClass}
            logoObjectPosition={game.logoObjectPosition}
            accentRingClass={game.accentRingClass}
          />
        ))}
      </div>
    </div>
  );
}