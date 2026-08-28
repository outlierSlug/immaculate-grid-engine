# GachaGrid — System Overview

A companion to `docs/ARCHITECTURE.md`, which is comprehensive but long. This is the short version: what the system is, how its pieces fit together, and what to know before changing it. Read this first; go to `ARCHITECTURE.md` for the exhaustive version of any section.

**Stats**: ~3,900 lines of backend Java (78 files), ~8,500 lines of frontend TypeScript (64 files, 37 components). Four games live: Genshin Impact, Honkai: Star Rail, Brawl Stars, Clash Royale.

## What it is

A daily/unlimited "immaculate grid" puzzle game across four games: fill a 3×3 board where every pick must satisfy both its row and column category (element × weapon, rarity × path, etc.), sharing one puzzle engine across all four.

## Stack

- **Backend**: Spring Boot 4 / Java 21, Postgres (JPA/Hibernate), deployed to Render as a Docker container.
- **Frontend**: React 19 / TypeScript / Vite / Tailwind v4, deployed to Cloudflare Pages.
- **DB**: Neon (Postgres), local dev via a `grid-postgres` Docker container.
- **Auth**: Google OAuth for the handshake only (see below); a hand-rolled bearer-token layer for everything else.

## The core abstraction: `GameModule`

Everything about "which game" funnels through one interface: [`GameModule.java`](backend/src/main/java/com/tonyl/backend/game/GameModule.java) — `getGameId()` and `getCategoryDefinitions(entities)`. Each game (`GenshinGameModule`, `BrawlStarsGameModule`, `ClashRoyaleGameModule`, `StarRailGameModule`) is one small class that turns a game's raw entity attributes into `CategoryDefinition`s — almost always via `AttributeEqualsCategory`, a generic "this attribute equals this value" category that needs no per-game code at all. `GameModuleRegistry` maps a `gameId` string to its module; that's the entire seam a new game has to cross.

This is *the* reason the engine held up across four genuinely different data shapes (character roster twice over, a card game, a second character roster with a different attribute set) with almost no engine-level code changes — new games are ingestion work and frontend config, not new puzzle logic.

**One real wrinkle**: "a raw record can be multiple guessable entities." Genshin's Traveler (7 elements × 2 genders), Clash Royale's Evolution/Hero card forms, Star Rail's Trailblazer (5 paths × 2 genders) and March 7th's two playable forms — all handled at ingestion time, not in the engine. The pattern recurs often enough it's worth knowing before adding a fifth game.

## Data pipeline

`ingestion/<game>/`: `fetch` → `normalize.py` (+ `schema.py`, a Pydantic model that validates and warns on thin categories) → `download_icons.py`. Output is a flat `entities.json` (id, display_name, image_url, attributes), copied into `backend/src/main/resources/`. Loaded into Postgres by [`GameDataLoader`](backend/src/main/java/com/tonyl/backend/loader/GameDataLoader.java), a `CommandLineRunner` gated behind the `load-data` Spring profile — an explicit, one-shot step, both locally and against prod (Neon), never run implicitly.

Three of four pipelines are pure Python; Star Rail's fetch step is Node (its only usable data-access library is JS-only), but normalization is still Python, reading the library's downloaded cache files directly rather than trusting its object model.

## Puzzle generation

[`GridGenerator`](backend/src/main/java/com/tonyl/backend/puzzle/GridGenerator.java): given a date and a game's entities/categories, picks 3 row + 3 col categories from different dimensions, computes each cell's valid-answer set, and requires a full bipartite matching (every cell can be assigned a *distinct* entity — the "soft lock guard," since a cell having ≥1 candidate isn't sufficient if two cells can only be satisfied by the same one entity). Deterministic per `(gameId, date)` — same date always regenerates the same puzzle.

Daily generation wraps this in retry-then-exhaustive-fallback (`PuzzleService.generateDailyPuzzle`): a single random attempt isn't reliable enough for thinner category sets, so production leans on the fallback, not the raw single-attempt success rate. `GridGeneratorTest` covers all four games for both correctness and fairness (character-coverage/appearance-distribution reports, not just pass/fail).

## Gameplay & guess enforcement

`PuzzleService.checkGuess` is the one place correctness and guess-budget are enforced — the frontend's own guess counter is display-only. Guess consumption is a single atomic upsert (`puzzle_guess_counts`, `ON CONFLICT ... DO UPDATE ... WHERE guesses_used < ?`) committed *before* the response is built, so it's correct under concurrent requests even without app-level locking. Daily's limit is a fixed constant (9); Unlimited's is caller-chosen (including genuinely unlimited).

## Auth model

Spring Security exists for exactly one thing: the Google OAuth2 authorization-code exchange (see [`SecurityConfig`](backend/src/main/java/com/tonyl/backend/config/SecurityConfig.java)'s own comment — deliberately not this API's auth layer; every request is `permitAll()`ed through it). Real per-request auth is a custom `@CurrentUser` argument resolver reading a bearer token against a DB-backed `UserSession` table with an expiry check — fully independent of Spring Security's request context. Anonymous play uses a random `sessionId` generated client-side and persisted in `localStorage`, threaded through the same request paths as a logged-in user's identity.

## Stats

`PuzzleStatsService` computes everything live, on every request — nothing is cached or precomputed. **UNIQ** score: `900 - Σ(100 - percentChosen)` over correctly-filled cells, where `percentChosen` is a leave-one-out share of other players' picks for that cell. Because it's always live, the same completed puzzle can show a different UNIQ/percentile on a later visit as more people play it — a deliberate choice, not a caching gap.

## Frontend structure

8 pages, 37 components, exactly 2 custom hooks — most state lives in the hook that owns it, not global stores. [`usePuzzleGuesses`](frontend/src/hooks/usePuzzleGuesses.ts) is the load-bearing one: owns grid-filling/guess state for both Daily and Unlimited, with an optional `persistKey` for localStorage persistence and cross-tab sync via the `storage` event. `config/games.ts` is the single source of truth for anything game-specific on the frontend (hero art, logo, accent color, avatar shape/sizing) — adding a game to this object is most of what's needed for it to become fully routable (`/:game` is a generic route param, not hardcoded per game). `CategoryChip.tsx` is the other per-game-modularized file (icons/tooltips/colors), deliberately keyed by `(game, label)` so two games reusing the same label text (e.g. both Brawl Stars and Clash Royale have "Common"/"Rare") never leak into each other.

## Admin tooling

`AdminPuzzleService` (candidate generation, pinning, history) and `AdminTrackingService` (dimension-pairing/category-appearance stats across recent puzzles) back an admin-only panel, gated by an email allowlist (`AdminAuthorization`), not a role in the DB.

## Deployment

Cloudflare Pages (frontend) + Render, Docker runtime (backend) + Neon (DB). Fully env-var driven — `render.yaml` declares required keys (`sync: false`, real values live only in Render's dashboard), nothing secret is committed. Backend needs `runtime: docker` because Render has no native Java/Maven runtime; `backend/Dockerfile` governs the actual build/start commands.

## Things worth knowing before scaling or auditing further

- **`ddl-auto=update`, no migration tool.** Fine so far, but schema changes are applied implicitly on boot with no rollback story — worth a real look (Flyway/Liquibase) before schema changes get more frequent or risky.
- **Stats are computed live, every request, with no cache.** Fine at current traffic; the first place to look if a popular puzzle's stats endpoint ever gets slow.
- **No CI pipeline** — tests run locally/manually, not automatically on push or PR.
- **Render free tier cold-starts after 15 min idle** — an accepted tradeoff from the original deployment decision, not an oversight.
- **`games.ts`/`CategoryChip.tsx` grow linearly with each new game** — manageable at four, worth revisiting the pattern if a fifth or sixth game is likely.
