import { GAMES } from '../config/games';
import GameCard from '../components/GameCard';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex flex-col items-center px-6 py-16 sm:py-20 motion-safe:animate-[page-in_350ms_ease-out]">
      <div className="text-center max-w-lg mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
          GachaGrid
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

      {/* EDIT ME: replace both placeholder paragraphs below with your own
          copy - headings can change too, these are just a starting shape. */}
      <div className="mt-16 sm:mt-20 max-w-2xl w-full border-t border-gray-200 dark:border-gray-800 pt-12 flex flex-col gap-10">
        <section>
          <h2 className="text-xl font-bold tracking-tight mb-2">What is GachaGrid?</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            [Write about what GachaGrid is here — the concept, how a puzzle works, what inspired it.]
          </p>
        </section>
        <section>
          <h2 className="text-xl font-bold tracking-tight mb-2">From the developer</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            [Write your own context here — who you are, why you built this, anything you want players to know.]
          </p>
        </section>
      </div>
    </div>
  );
}