import { Link } from 'react-router-dom';
import { GAMES } from '../config/games';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold mb-3">
        Immaculate Grid Engine
      </h1>

      <p className="text-gray-600 mb-8">
        Choose a game
      </p>

      <div className="flex flex-col gap-4 w-full max-w-md">
        {Object.values(GAMES).map((game) => (
          <Link
            key={game.id}
            to={`/${game.id}`}
            className="
              bg-white
              border border-gray-200
              rounded-xl
              p-6
              text-center
              font-semibold
              shadow-sm
              hover:bg-gray-50
              hover:shadow
              transition
            "
          >
            {game.label}
          </Link>
        ))}
      </div>
    </div>
  );
}