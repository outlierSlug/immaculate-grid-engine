# Roadmap

## Phase 0 — Data pipeline [COMPLETE]
- [x] Confirmed data source: genshindev/api, hosted at genshin.jmp.blue
      (no official API exists; community-maintained, OSL-3.0 licensed)
- [x] `fetch_genshin.py` — pulls raw data via the bulk `/characters/all`
      endpoint, saves untouched to /ingestion/genshin/raw
- [x] `normalize_genshin.py` — transforms into the generic Entity/GridItem
      schema, writes to /ingestion/genshin/output/genshin_entities.json
- [x] Validation pass (schema.py / pydantic): no null required fields, no
      duplicate IDs, thin-category warnings
- [x] Seed JSON committed (92 of 118 actual characters — source data is
      stale past patch 5.0; backfill tracked in Backlog, non-blocking)
- [x] Roster since hand-extended to 132 entries by manually curating
      `raw/genshin_characters.json` from the Genshin wiki — the bulk-fetch
      script is effectively superseded for day-to-day data fixes;
      `normalize_genshin.py` is now the only ingestion file that should be
      edited (see Architecture doc)

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

## Phase 3 — Multi-page frontend + Unlimited Mode [COMPLETE]
Goal: turn the single-view prototype into a real multi-page app
(`/`, `/:game`, `/:game/unlimited`) and ship a fully-featured Unlimited
mode, not just a stub route.

- [x] `react-router-dom` v7 routing: `/` (game select) → `/:game` (Daily,
      renamed from the old single-view `App.tsx`) → `/:game/unlimited`
- [x] Shared `Layout` + `Header` (game switcher modal, Daily/Unlimited
      toggle) — the toggle was UI-only/non-functional until this phase
- [x] `usePuzzleGuesses` hook extracted from the old monolithic puzzle
      view — shared grid-fill/guess-submission/completion-detection state
      for both Daily and Unlimited, so they only differ in how the puzzle
      is obtained
- [x] Backend: `Puzzle.mode` (DAILY/UNLIMITED), seed+`minAnswersPerCell`
      overload on `GridGenerator`, `POST /api/puzzle/unlimited`,
      `GET /api/games/{game}/categories`, `GameModuleRegistry`,
      `ApiExceptionHandler` for real HTTP status codes on the new
      validation paths
- [x] `UnlimitedSettingsPanel`: Pokedoku-inspired design — per-dimension
      filter chips that open a detail overlay (All toggle + per-value
      checkboxes, never toggle inclusion via the chip itself),
      "Allow single-answer cells" and "Show Timer" toggles, fully
      controlled/live-persisted settings (no discardable draft), identical
      component used inline (first load) and as a hamburger-opened modal
- [x] `Timer` (always running once a puzzle exists, toggle only controls
      visibility, freezes on completion) + `Score` (`correct/total`,
      live) in a `PuzzleGrid`-integrated info column
- [x] `PuzzleGrid` rewritten to CSS Grid (from nested flex rows) so the
      grid stays pixel-centered regardless of side-column content, plus
      `CategoryChip` text-wrapping fix for long labels
- [x] Graceful generation failure handling: reverts to the loadup screen
      and surfaces the backend's real error text
- [x] Data fix: Traveler `release_version` was uniformly "1.0" for every
      element, allowing impossible puzzles (e.g. "1.0 × Dendro"); fixed
      per-element in `normalize_genshin.py`, reloaded

## Phase 4 — Finish Unlimited Mode [NEXT]
Goal: the two known, deliberately-scoped-out gaps from Phase 3.

- [ ] 9-guess limit — Immaculate-Grid-genre convention: one shared pool
      across all 9 cells (not per-cell, not wrong-guesses-only; every
      submitted guess consumes one). Client-side only for now, consistent
      with the existing single-player used-answer-tracking model. Needs a
      design decision on the "out of guesses with cells still empty" end
      state before implementation.
- [ ] `GridGenerator` puzzle variety: currently correct but can produce
      all-same-dimension rows/cols (e.g. all 3 columns being different
      character models) since categories are pooled across a whole
      dimension-group rather than preferring one dimension per row/col.
      Needs a new `GridGeneratorTest` invariant alongside the fix.

## Phase 5 — Daily puzzle depth & polish
Goal: Daily is the most important surface in this genre (the thing a
player returns to once a day) and it hasn't had a dedicated pass since
Phase 1 — everything built for Unlimited in Phase 3 should land here too.

- [ ] Wire `Timer`/`Score`/completion messaging into `PuzzlePage` — the
      `usePuzzleGuesses` hook already exposes everything needed
- [ ] Apply the Phase 4 guess-limit and generation-variety work to Daily
- [ ] Additional category dimensions (candidates: affiliation, birthday
      month — both already present in raw ingested data, unused so far)
- [ ] General UI polish: replace `alert()`-based wrong-guess feedback with
      inline shake/toast
- [ ] Consider a Wordle-style shareable result summary — common genre
      expectation for a once-a-day puzzle, not yet scoped in detail
- [ ] localStorage persistence for in-progress puzzle state (survive a
      refresh) and for Daily/Unlimited state across navigation (currently
      switching modes discards in-progress state)

## Phase 6 — Guess stats & deployment (~2 weeks)
Goal: ship the daily puzzle as a real, live, playable product with the
rarity/uniqueness mechanic that makes this genre engaging.

- [ ] Anonymous session identifier (client-generated UUID, localStorage)
      — no real auth needed for this
- [ ] `puzzle_answers` table logging (puzzle_id, cell_key, item_id) per
      correct guess
- [ ] Aggregation endpoint: per-cell answer rarity ("X% of players chose
      this")
- [ ] Frontend: display rarity % on filled cells, matching reference UI
- [ ] Deploy backend (Fly.io/Railway) + frontend (Vercel/Netlify) +
      managed Postgres
- [ ] CORS origins moved to real config for the deployed domain

## Phase 7 — Real-time head-to-head (~2-3 weeks)
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

## Phase 8 — Scale / advanced features
- [ ] Leaderboards / streaks
- [ ] Redis for active room state (if needed under real multiplayer load)
- [ ] Third GameModule — real proof point for a GameModule registry
      replacing the current hardcoded switch (`GameModuleRegistry`
      centralized the duplication in Phase 3, but didn't remove the
      hardcoding itself)

## Backlog (non-blocking)
Full detail lives in `docs/ARCHITECTURE.md`'s Backlog section — kept in
sync here at a glance:
- Brawl Stars: model/body-type attribute (needs a second data source),
  expanded attribute set (Super/Star Power count) for richer categories,
  rarity color mapping for CategoryChip, class-metadata gap
- Real `GameModule` registry (config/filesystem-driven, not a hardcoded
  switch) — once a third game exists or this is deployed
- Rate limiting + server-side used-answer tracking on `/guess` — required
  before Phase 7 (H2H), not urgent before then
- CORS origins moved to configuration once a deployment target exists
- Multi-variant entity disambiguation (Traveler-style: same display name,
  differing key attributes) is a general ingestion pattern to watch for
  in any future GameModule, not a one-off
- Soft lock guard (Pokedoku concept: prevent a correct-but-greedy guess
  from stranding another cell) — explicitly deferred, needs cross-cell
  dependency analysis; not planned unless specifically requested

## Notes
- Total estimate: ~8-10 weeks part-time, revised upward from the original
  estimate given Phase 3 grew into a full Unlimited-mode build rather than
  a lighter "polish pass."
- Phases 0-3 complete. Phase 2 additionally validated the architecture
  empirically (not just by design) and fixed a real latent bug in the
  process; Phase 3 did the same for the frontend (the `PuzzleGrid`
  centering bug and the `ddl-auto=update` schema gotchas were both only
  discovered by actually running the app end-to-end, not by code review).
