# Roadmap

## Phase 0 — Data pipeline [COMPLETE]
- [x] Confirmed data source: genshindev/api, hosted at genshin.jmp.blue
      (no official API exists; community-maintained, OSL-3.0 licensed)
- [x] `fetch_genshin.py` — pulls raw data via the bulk `/characters/all`
      endpoint, saves untouched to /ingestion/genshin/raw
- [x] `normalize.py` — transforms into the generic Entity/GridItem schema,
      writes to /ingestion/genshin/output/genshin_entities.json
- [x] Validation pass (schema.py / pydantic): no null required fields, no
      duplicate IDs, thin-category warnings
- [x] Seed JSON committed (92 of 118 actual characters — source data is
      stale past patch 5.0; backfill tracked in Backlog, non-blocking)

## Phase 1 — Single-player Genshin MVP [COMPLETE]
- [x] Spring Boot 4 backend scaffolded (Java 21, Maven, Postgres via Docker)
- [x] `GridItem` JPA entity (JSONB attributes), `GridItemRepository`
- [x] Data loader loading seed JSON into Postgres (later generalized in
      Phase 2, see below)
- [x] `CategoryDefinition` / `GameModule` / `GenshinGameModule` — category
      generation derived from actual loaded data, not hardcoded
- [x] `GridGenerator` — deterministic (date-seeded), constraint-satisfaction
      grid generation with bounded retry
- [x] `Puzzle` entity + `PuzzleRepository`, `PuzzleService` (find-or-generate
      by `(gameId, date)`)
- [x] `GET /api/puzzle/today`, `POST /api/puzzle/{id}/guess`,
      `GET /api/items` — solutions never serialized into any response
- [x] CORS configured for local frontend dev
- [x] React + TypeScript + Vite + Tailwind frontend scaffolded
- [x] `PuzzleGrid`, `CategoryChip` (element-colored badges), `GuessInput`
      (search modal) components
- [x] Full guess loop working end-to-end: search → select → validate →
      fill cell or reject
- [x] Correctness fixes: lowercase ID normalization (Mualani casing bug),
      Traveler multi-variant display-name disambiguation

## Phase 2 — Prove the abstraction [COMPLETE]
- [x] Ingestion restructured to per-game subfolders
      (`ingestion/genshin/`, `ingestion/brawlstars/`), shared venv/deps at
      `ingestion/` root
- [x] Brawl Stars ingestion pipeline (BrawlAPI, no-auth static JSON source)
- [x] `BrawlStarsGameModule` — zero new abstractions needed, reused
      `CategoryDefinition`/`AttributeEqualsCategory` unmodified
- [x] `GenshinDataLoader` deleted, replaced with generic `GameDataLoader`
      driven by a `gameId -> seed file` map — proved data *loading*, not
      just game logic, generalizes cleanly
- [x] Found and fixed a real bug: `GridGenerator` could produce
      structurally-impossible cells when a row and column category shared
      an attribute dimension. Fixed via dimension-partitioning (categories
      now grouped by dimension, rows/cols drawn from disjoint dimension
      groups). This was a latent defect affecting Genshin too, just masked
      by having more dimensions to shuffle across.
- [x] Frontend game switcher — simple toggle between Genshin/Brawl Stars,
      re-fetches puzzle + roster on switch, resets stale state correctly
- [x] Confirmed working end-to-end for both games: puzzle generation,
      guess validation (correct + incorrect cases), frontend rendering

## Phase 3 — Content depth & visual polish (~1-2 weeks) [NEXT]
Goal: make the puzzles genuinely more interesting to solve, and make the
game look/feel like a real product instead of a functional prototype.
Deliberately sequenced before stats (Phase 4) — richer categories make
rarity percentages meaningful instead of trivial.

- [ ] Genshin: additional category dimensions (candidates: affiliation,
      birthday month — both already present in raw ingested data, unused
      so far; release_version via date lookup table)
- [ ] Brawl Stars: additional category dimensions (candidates: Super
      count, Star Power count, Gadget count)
- [ ] Category icons instead of plain text (element symbols, region
      emblems, Brawl Stars rarity colors using BrawlAPI's provided hex
      values)
- [ ] Filled-cell rendering: character/brawler icon (not full splash art)
      in the grid cell, matching the reference game's compact style
- [ ] General UI polish pass: replace alert()-based wrong-guess feedback
      with inline shake/toast, win-state UI once all 9 cells are filled,
      guess-counter sidebar

## Phase 4 — Guess stats & deployment (~2 weeks)
Goal: ship the daily puzzle as a real, live, playable product with the
rarity/uniqueness mechanic that makes this genre engaging.

- [ ] Anonymous session identifier (client-generated UUID, localStorage)
      — no real auth needed for this
- [ ] `puzzle_answers` table logging (puzzle_id, cell_key, item_id) per
      correct guess
- [ ] Aggregation endpoint: per-cell answer rarity ("X% of players chose
      this")
- [ ] Frontend: display rarity % on filled cells, matching reference UI
- [ ] localStorage persistence for in-progress puzzle state (survive a
      refresh)
- [ ] Deploy backend (Fly.io/Railway) + frontend (Vercel/Netlify) +
      managed Postgres
- [ ] CORS origins moved to real config for the deployed domain

## Phase 5 — Real-time head-to-head (~2-3 weeks)
Deliberately after a deployed, polished single-player game exists —
additive feature on a proven foundation, not a prerequisite for having a
demoable product.

- [ ] Spring WebSocket session/room model
- [ ] Matchmaking queue
- [ ] Server-authoritative guess validation (shared used-entity set per
      room)
- [ ] Reconnect handling
- [ ] Rate limiting + server-side used-answer tracking on /guess (unsafe
      to defer once an opponent is involved, unlike single-player)

## Phase 6 — Scale / advanced features
- [ ] Leaderboards / streaks
- [ ] Redis for active room state (if needed under real multiplayer load)
- [ ] Third GameModule — real proof point for a GameModule registry
      replacing the current hardcoded switch/map
## Backlog (non-blocking)
- Backfill ~26 missing Genshin characters (patch 5.1+) not present in the
  current data source
- Add `release_version` (e.g. "4.2") via a date -> patch-version lookup
  table; not present in the current data source
- Add character model/body type as an attribute — requires a second data
  source (likely Fandom wiki)
- Frontend: map category values (element, region, rarity, etc.) to icon
  assets instead of plain text
- Tighten grid generation to reject overly-easy (1-answer) or low-variety
  combinations
- CORS origins should move to configuration rather than a hardcoded
  annotation value once a deployment target exists
- Multi-variant entity disambiguation is a general pattern, not a one-off:
  any GameModule with entities sharing a display name but differing by a
  key attribute (Genshin's Traveler, one entity per element) must
  disambiguate display_name at normalize time, since raw source data often
  differentiates IDs/attributes but not names
- Real `GameModule` registry — replace the hardcoded switch/map in
  `PuzzleService.resolveModule()` and `GameDataLoader.GAME_SEED_FILES`
  once a third game is added or this is deployed
- Expand Brawl Stars attribute set for
  richer category variety
- Brawl Stars rarity color mapping for CategoryChip (BrawlAPI provides a
  color hex per rarity, not yet captured at ingestion)
- BrawlAPI class-metadata gap: some current, released brawlers have
  unclassified/"Unknown" class data in this dataset

## Notes
- Total estimate: ~8-10 weeks part-time.
- Phases 0-2 complete. Phase 2 additionally validated the architecture
  empirically (not just by design) and fixed a real latent bug in the
  process — a better outcome than if it had "just worked" without
  surfacing anything.