# Immaculate Grid Engine
A game-agnostic "immaculate grid" style puzzle engine. Fill a
3x3 grid where each cell's answer satisfies both its row and column
category!

The public-facing product built on top of it is branded
**GachaGrid**. Test your knowledge and play a new puzzle every day!
Currently supported games: Genshin Impact, Honkai: Star Rail, Brawl
Stars, and Clash Royale.

## Live

**[gachagrid.com](https://gachagrid.com)**

## Features

- **Daily puzzle.** One puzzle per game, shared by every player and reset at
  midnight Pacific time.
- **Unlimited mode.** Generate fresh puzzles on demand and choose which
  categories can appear.
- **Community stats.** See how often each answer was picked, and earn a
  uniqueness score for finding obscure correct answers.
- **Accounts.** Sign in with Google to keep personal stats, daily streaks,
  and a 30-day archive of past puzzles.
- **Collection.** Every character you answer correctly in a live Daily is
  added to your collection. In Genshin Impact and Honkai: Star Rail,
  duplicates unlock constellations and eidolons.

## How it works

**Puzzle generation.** Categories are derived from each game's data rather
than hard-coded. The generator groups them by attribute dimension so a row
and column can never contradict each other, weights them so common
categories don't crowd out the rest, and requires every cell to have enough
valid answers. Daily puzzles also pass a perfect-matching check, which
guarantees the board can be completed with nine *different* characters, not
just that each cell has an answer on its own. Dailies are seeded by date, so
every player sees the same grid.

**Stats computed live.** Streaks, pick rates, uniqueness scores, and
collections are all derived from recorded puzzle attempts when requested.
Nothing is stored as a running counter, so new features apply retroactively.
The collection launched already populated from each player's past games.

**Data pipelines.** Each game has its own ingestion pipeline that normalizes
a different mix of sources into one shared attribute schema: official and
community APIs, datamined game files, and wiki data, cross-checked against
each other where they overlap.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Java 21, Spring Boot |
| Database | PostgreSQL |
| Data ingestion | Python (Node for Star Rail) |
| Hosting | Cloudflare Workers (frontend), Render (backend), Neon (database) |
| Auth | Google OAuth with server-side session tokens |

## Repository layout

```
backend/     Spring Boot API: puzzle generation, stats, accounts, admin tools
frontend/    React single-page app
ingestion/   Per-game data pipelines (fetch, normalize, download icons)
docs/        Architecture, roadmap, and project overview
```

## Running locally

**Prerequisites:** Java 21, Node.js, Docker, and a Google OAuth client for
sign-in.

**1. Set up the database.** The backend stores everything (game rosters,
puzzles, player accounts) in PostgreSQL. The simplest way to run it locally
is with Docker. This downloads Postgres 16 and starts it in the background,
with an empty database called `immaculate_grid` and a user called `grid`:

```bash
docker run -d --name grid-postgres \
  -e POSTGRES_USER=grid -e POSTGRES_PASSWORD=<choose-a-password> \
  -e POSTGRES_DB=immaculate_grid -p 5432:5432 postgres:16
```

Keep the password you chose, since the backend needs it in the next step.
There's no schema to set up: the backend creates its own tables the first
time it starts. After restarting your computer, bring the database back with
`docker start grid-postgres`.

Those names are just the backend's defaults. The container name can be
anything, and a different database or user works as long as you set
`DB_URL` and `DB_USERNAME` to match.

**2. Set environment variables.** The backend reads real environment
variables, not a `.env` file. At minimum, set `DB_PASSWORD` (the password
from step 1), `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`. The backend
won't start without them. See [`backend/.env.example`](backend/.env.example) for the full
list.

**3. Load the game data and start the backend.** Running once with the
`load-data` profile populates every game's roster, and it is safe to re-run.

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=load-data   # first run only
./mvnw spring-boot:run
```

**4. Start the frontend.**

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`, talking to the API on port 8080.

## Documentation

- [Overview](docs/OVERVIEW.md): what the project is and how the pieces fit
- [Architecture](docs/ARCHITECTURE.md): design decisions and the bugs that shaped them
- [Roadmap](docs/ROADMAP.md): what has shipped and what is next

## Community

Suggest features, report bugs, or talk about the daily puzzle on
**[Discord](https://discord.gg/MbcECzvez)**.

## Disclaimer

GachaGrid is an unofficial fan project and is not affiliated with, endorsed,
sponsored, or approved by HoYoverse, Cognosphere, or Supercell. All game
names, characters, and assets are the property of their respective owners.

This material is unofficial and is not endorsed by Supercell. For more
information see Supercell's [Fan Content Policy](https://supercell.com/en/fan-content-policy/).

## License

The source code is released under the [MIT License](LICENSE). Game names,
characters, and assets are not covered by this license.
