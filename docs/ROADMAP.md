# Roadmap

## Phase 0 — Data pipeline [COMPLETE]
- [x] Confirmed data source: genshindev/api, hosted at genshin.jmp.blue
      (no official API exists; community-maintained, OSL-3.0 licensed)
- [x] `fetch_genshin.py` — pulls raw data via the bulk `/characters/all`
      endpoint, saves untouched to /ingestion/raw
- [x] `normalize.py` — transforms into the generic Entity/GridItem schema,
      writes to /ingestion/output/genshin_entities.json
- [x] Validation pass (schema.py / pydantic): no null required fields, no
      duplicate IDs, thin-category warnings
- [x] Seed JSON committed (92 of 118 actual characters — source data is
      stale past patch 5.0; backfill tracked in Backlog, non-blocking)

## Phase 1 — Single-player Genshin MVP [COMPLETE]
- [x] Spring Boot 4 backend scaffolded (Java 21, Maven, Postgres via Docker)
- [x] `GridItem` JPA entity (JSONB attributes), `GridItemRepository`
- [x] Data loader (`GenshinDataLoader`, profile-gated `CommandLineRunner`)
      loading seed JSON into Postgres
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

## Phase 2 — Prove the abstraction (~1 week) [NEXT]
- [ ] Second GameModule (Brawl Stars)
- [ ] New ingestion script + normalize.py for that game
- [ ] Confirm zero changes needed in grid generator / API / frontend beyond
      a game_id parameter
- [ ] Replace `PuzzleService.resolveModule()`'s hardcoded if-check with a
      real GameModule registry now that a second module exists

## Phase 3 — Real-time head-to-head (~2-3 weeks)
- [ ] Spring WebSocket session/room model
- [ ] Matchmaking queue
- [ ] Server-authoritative guess validation (shared used-entity set per room)
- [ ] Reconnect handling
- [ ] Rate limiting + server-side used-answer tracking on /guess (currently
      deferred as safe for single-player only — see architecture doc)

## Phase 4 — Polish / scale (~1-2 weeks)
- [ ] Leaderboards / stats
- [ ] Redis for active room state (if needed)
- [ ] Deployment: backend on Fly.io/Railway, frontend on Vercel/Netlify
- [ ] localStorage persistence for in-progress puzzle state
- [ ] Replace alert()-based wrong-guess feedback with inline UI (shake/toast)
- [ ] Win-state UI once all 9 cells are filled
- [ ] Guess counter / stats sidebar (matching reference UI: attempts
      remaining, points)

## Backlog (non-blocking)
- Backfill ~26 missing Genshin characters (patch 5.1+) not present in the
  current data source
- Add `release_version` (e.g. "4.2") via a date -> patch-version lookup
  table; not present in the current data source
- Add character model/body type as an attribute — requires a second data
  source (likely Fandom wiki)
- Frontend: map category values (element, region, etc.) to icon assets
  instead of plain text
- Tighten grid generation to reject overly-easy (1-answer) or low-variety
  combinations
- CORS origins should move to configuration rather than a hardcoded
  annotation value once a deployment target exists
- Multi-variant entity disambiguation is a general pattern, not a one-off:
  any GameModule with entities sharing a display name but differing by a
  key attribute (Genshin's Traveler, one entity per element) must
  disambiguate display_name at normalize time, since raw source data often
  differentiates IDs/attributes but not names. Watch for this in the
  Slay the Spire ingestion script too.

## Notes
- Total estimate: ~8-10 weeks part-time.
- Phases 0-1 complete. Front-loading these before recruiting season gets
  heavy has paid off — a working single-player demo already exists even
  though later phases haven't started.