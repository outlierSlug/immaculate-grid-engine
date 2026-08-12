# Architecture
 
## Overview
 
A game-agnostic "immaculate grid" puzzle engine (Pokedoku/Hoopgrids-style: fill
a 3x3 grid where each cell's answer must satisfy both its row and column
category). Genshin Impact is the first supported game. The engine is built so
a new game requires a new data module and ingestion script, not engine
changes — enforced in practice by keeping all core logic (grid generation,
validation, persistence, API shape) written against generic interfaces that
take a `gameId`, never against Genshin-specific types.
 
## Tech stack
 
| Layer      | Choice                                  | Notes |
|------------|------------------------------------------|-------|
| Ingestion  | Python 3, `requests`, `pydantic`         | Decoupled from backend language on purpose |
| Backend    | Java 21, Spring Boot 4.1.0               | Spring Web(MVC), Spring Data JPA, Validation |
| Database   | PostgreSQL 16 (Docker locally)           | JSONB columns for flexible per-game attributes |
| ORM        | Hibernate 7.4 (via Spring Data JPA)      | `hypersistence-utils-hibernate-73` for JSONB mapping |
| JSON       | Jackson 3 (`tools.jackson.*`)            | Ships with Spring Boot 4 by default |
| Frontend   | React + TypeScript + Vite                | Not yet started |
 
### Version-specific gotchas (Spring Boot 4 / Hibernate 7 / Jackson 3)
 
This stack is new enough that a lot of tutorials/defaults assume older
versions. Concrete traps hit so far, kept here so they aren't re-derived:
 
- **Starter naming**: `spring-boot-starter-web` was renamed
  `spring-boot-starter-webmvc` in Spring Boot 4 (distinguishes MVC from
  WebFlux). Spring Initializr already generates the correct name.
- **Jackson 3 package rename**: `com.fasterxml.jackson.*` →
  `tools.jackson.*` for everything except annotations, which stay under
  `com.fasterxml.jackson.annotation`. The mutable `ObjectMapper` is replaced
  by an immutable, builder-based `JsonMapper` (Spring auto-configures a
  `JsonMapper` bean, inject that instead of `ObjectMapper`).
- **hypersistence-utils version must match Hibernate major/minor**: this
  project runs Hibernate 7.4, which requires the
  `hypersistence-utils-hibernate-73` artifact (not `-63`, which targets
  Hibernate 6.x and fails at runtime with `class file for
  org.hibernate.query.BindableType not found`).
- **JSONB-mapped types must implement `Serializable`**: Hibernate's dirty
  checking deep-copies JSONB column values internally. Plain Java records
  used inside a `@Type(JsonType.class)` field (e.g. `CategorySnapshot`) must
  explicitly `implements Serializable` or saves fail at runtime with
  `NonSerializableObjectException`, even though the class compiles fine.
## Core abstractions (game-agnostic)
 
- **GridItem** — the guessable thing (character, card, creature). Named
  `GridItem` rather than `Entity` specifically to avoid clashing with JPA's
  own `@Entity` annotation. Has an id, display name, image URL, and a
  flexible `attributes` bag.
- **CategoryDefinition** — a named predicate over `GridItem`s, generated
  from a game's attribute schema (e.g. `element == Pyro`, `rarity == 5`).
  Implemented as code (Java classes/predicates), not database rows — these
  are logic, not data. Only generated *puzzles* (which categories got
  picked for a given date) become persisted rows.
- **GameModule** — a plugin providing category-generation rules for one
  game, derived from the actual loaded data rather than hardcoded (e.g. it
  scans for distinct `element` values rather than listing "Pyro, Hydro,
  Anemo..." literally, so new characters/values need no code changes).
- **Puzzle** — 6 chosen categories (3 row + 3 col) for a given
  `(gameId, date)`, plus the precomputed valid-answer set for each of the 9
  cells. Precomputed and cached at generation time rather than recomputed
  per guess, which keeps guess validation to a single map lookup and (later)
  guarantees both players in a multiplayer room see identical validation
  with no drift.
## Data model
 
### GridItem (JPA entity, table `grid_items`)
 
```json
{
  "id": "diluc",
  "gameId": "genshin",
  "displayName": "Diluc",
  "imageUrl": "https://genshin.jmp.blue/characters/diluc/card",
  "attributes": {
    "element": "Pyro",
    "weapon": "Claymore",
    "rarity": 5,
    "region": "Mondstadt",
    "release_date": "2020-12-23"
  }
}
```
 
- `id` is the natural key (lowercase slug, e.g. `"diluc"`), not an
  auto-generated numeric ID — makes re-running ingestion an upsert with no
  ID-mapping step.
- `attributes` is stored as Postgres `jsonb` via a `Map<String, Object>`,
  intentionally loose-typed at the persistence layer since different games
  have different attribute shapes. Stronger typing (if ever needed) lives at
  the `GameModule` layer, not here.
- **All incoming IDs must be lowercased at the boundary where they enter the
  system** (ingestion, and again defensively at guess-validation time).
  A real bug hit during ingestion: one character (`Mualani`) came back from
  the source API with inconsistent casing, which — before the fix — created
  a duplicate row (`Mualani` and `mualani` as distinct primary keys) rather
  than a clean upsert, since Postgres string comparisons are case-sensitive
  by default. `normalize.py` now lowercases `id` explicitly.
### Puzzle (JPA entity, table `puzzles`)
 
- `id`: `"{gameId}:{date}"`, e.g. `"genshin:2026-08-06"` — natural key,
  makes "does today's puzzle already exist" a single lookup and prevents
  ever generating two puzzles for the same game+date.
- `rowCategories` / `colCategories`: `List<CategorySnapshot>` (id + label
  only — snapshots of the categories chosen at generation time, not live
  `CategoryDefinition` objects, since those are logic and can't be
  persisted directly).
- `cellSolutions`: `Map<String, List<String>>`, keyed `"row-col"` (e.g.
  `"0-0"`), valued with the list of valid `GridItem` ids for that cell.
  **Never serialized into any API response** — see Security below.
## Data sourcing - Genshin
 
- **No official Genshin API exists.** Using `genshindev/api`, hosted at
  `https://genshin.jmp.blue` (community-maintained, OSL-3.0 licensed).
- Treated as a **build-time-only source, never a runtime dependency.** A
  Python script fetches once, normalizes into the `GridItem` schema above,
  and the result is committed as static JSON (`ingestion/output/`) — the
  live app never calls a third-party API. This protects the app from the
  source going down, rate-limiting, or changing shape.
- **Known data gap**: the source is stale relative to the live game. As of
  ingestion, it returns 92 of the 118 actual playable characters — data
  stops around patch 5.0 (~Sept 2024), roughly two years behind despite the
  source's README claiming "always up-to-date." Decision: proceed with 92
  for Phase 0/1 (grid generation logic is agnostic to roster size); backfill
  the missing ~26 characters is a deferred, non-blocking backlog item (see
  Backlog below) — likely via manual entry, since the missing data is plain
  structured facts (element/weapon/rarity/region/date), not copyrighted
  prose.
- Image URLs are constructed (`{base}/characters/{id}/card`), not fetched —
  the API exposes multiple image types per character (`card`, `icon`,
  `portrait`, etc.) but current usage is `card` only; no `icon` type is
  available from this source (see Backlog).

## Multi-game validation (Phase 2)

A second GameModule (Brawl Stars) was added specifically to test whether
the game-agnostic claim held up in practice, not just on paper. Result:
adding it required exactly two new files (`BrawlStarsGameModule.java`,
`ingestion/brawlstars/fetch_brawlstars.py` + `normalize.py`) and one line
each in two still-hardcoded lookup points (`GameDataLoader.GAME_SEED_FILES`,
`PuzzleService.resolveModule()`). Zero changes to `domain`, `repository`,
`api`, `GridGenerator`, or any frontend component beyond adding a game
selector — the puzzle grid, guess validation, and category-generation logic
are unmodified and shared across both games.

### Data loading was also generalized, not just game logic

The original `GenshinDataLoader` was deleted and replaced with a single
`GameDataLoader` that loads any number of games from a
`Map<String, String>` of `gameId -> seed filename`. This matters because
it proves the *loading mechanism*, not just the domain model, is
game-agnostic — a subtlety easy to miss if only the `GameModule` layer
gets abstracted while data loading stays copy-pasted per game.

### Real bug found: GridGenerator's dimension-collision defect

Brawl Stars only has 2 category dimensions (`rarity`, `brawler_class`),
versus Genshin's 4 (`element`, `weapon`, `rarity`, `region`). The original
`GridGenerator` shuffled all categories together and split the first 3 as
rows, the rest as columns, with no awareness of which attribute a category
came from. This is structurally broken: if a row category and a column
category are drawn from the same dimension (e.g. row = `rarity==Legendary`,
col = `rarity==Epic`), that cell is mathematically unsatisfiable — no
entity can have two different rarities. With Genshin's 4 dimensions, 500
random shuffle attempts were likely to avoid this by chance; with Brawl
Stars' 2 dimensions, it failed close to every time.

**This was a latent bug affecting both games**, not a Brawl-Stars-specific
issue — Genshin was just unlikely to trigger it, not immune to it. This is
the concrete payoff of doing Phase 2's cross-game validation: it surfaced
a real correctness defect that a single-game test suite would not have
reliably caught.

**Fix**: `CategoryDefinition` gained a `getDimension()` method (the
attribute key a category is drawn from, e.g. `"rarity"`). `GridGenerator`
now partitions all available categories by dimension, randomly splits the
*dimensions* (not individual categories) into two disjoint groups, and
draws rows from one group's categories and columns from the other. This
guarantees no row/column pair can ever share a dimension, eliminating the
structurally-impossible-cell case entirely rather than just making it less
likely. Requires at least 2 distinct dimensions to run at all (returns
`Optional.empty()` otherwise).

## Data sourcing — Brawl Stars

- **BrawlAPI** (`api.brawlapi.com`), a free, no-auth, community-run static
  JSON reference API — not the official `developer.brawlstars.com` API,
  which requires a key + IP allowlisting and is oriented around
  player/club stats rather than roster reference data. Same "build-time
  source only, snapshot to committed JSON, never called live" treatment as
  Genshin's data source.
- Response shape differs meaningfully from Genshin's: `rarity` and `class`
  arrive as nested objects (`{id, name, color}`), not flat strings —
  flattened to plain strings (`rarity.name`, `class.name`) at
  normalization time. `AttributeEqualsCategory`'s generic
  `attributeKey`/`expectedValue` design handled this with no changes,
  which was itself part of what Phase 2 was testing.
- **Known data gaps**, both non-blocking:
  - `unlock: null` / `released: false` brawlers are filtered out entirely
    at ingestion — not real, obtainable puzzle answers yet.
  - Some real, released, current brawlers have `class: {"id": 0, "name":
    "Unknown"}` in this dataset — modeled as `brawler_class: null` and
    excluded from class-based categories. This is a distinct issue from
    Genshin's staleness (missing characters entirely): here the brawler
    itself is present and correct, only the class attribute lags behind
    for some newer entries. Not blocking; revisit when backfilling data.
  - Only 2 usable category dimensions currently (rarity, class) vs.
    Genshin's 4 — expected, not a defect; not every `GameModule` needs the
    same number of dimensions, though more dimensions generally means
    richer/more varied puzzles.
## Grid generation algorithm
 
Implemented in `GridGenerator` (backend `puzzle` package), operating only
on `List<GridItem>` and `List<CategoryDefinition>` — no game-specific code.
 
1. Pull all `CategoryDefinition`s for the game (from its `GameModule`).
2. Seed RNG with `date.toEpochDay()` — deterministic, so the same date
   always produces the same shuffle without needing to hand out a
   server-generated puzzle over the network; "today's puzzle" is
   reproducible from the date alone.
3. Shuffle categories, take 3 as rows and 3 as columns.
4. For each of the 9 row×col pairs, compute the valid-answer set by
   filtering `GridItem`s against both predicates.
5. If any cell has zero matches, discard the combination and retry
   (bounded retry loop, currently 500 attempts) rather than surfacing a
   broken puzzle.
6. Return `Optional<GeneratedPuzzle>` — empty if no valid combination was
   found within the attempt budget. Callers must handle this explicitly;
   with only 92 characters across 4 attribute types, an unsolvable
   combination is a real possibility, not a hypothetical edge case.
7. On success, the caller (`PuzzleService`) snapshots the chosen categories
   and persists the whole `Puzzle` once per `(gameId, date)`.
Not yet implemented, flagged as a future refinement, not a bug: rejecting
combinations that are technically valid but low-quality (e.g. a cell with
only 1 possible answer, or one character satisfying 4+ cells and collapsing
puzzle variety). Current puzzles are solvable but not yet tuned for
difficulty/interest.
 
## API design and security
 
Two controllers so far:
 
- `GET /api/puzzle/today?game=genshin` → today's puzzle, category labels
  only (`rowLabels`, `colLabels`). Backed by `PuzzleService.
  getOrCreateTodaysPuzzle()`: look up by `(gameId, date)`, generate + persist
  only if missing.
- `POST /api/puzzle/{puzzleId}/guess` → `{ row, col, itemId }` in,
  `{ correct, itemId, displayName, imageUrl }` out. Validates by looking up
  the persisted `cellSolutions` for that cell; never returns the solution
  set itself, only whether the specific submitted guess was correct.
- `GET /api/items?game=genshin` → full character roster (id, name, image,
  attributes). Deliberately fully public — unlike puzzle solutions, the
  roster itself is meant to be public (the player is tested on recall
  against public data, same as the wider genre works: Pokedoku's Pokemon
  data is public too).
### What's actually protected vs. not — stated explicitly
 
**Protected:** the server never serializes `Puzzle.cellSolutions` (or any
per-cell answer list) into any HTTP response. `PuzzleResponse` and
`GuessResponse` are hand-built DTOs that only expose the fields that are
safe by design, not the entity minus some blocklist — there is no code path
where the answer key can leak as JSON.
 
**Not protected, by design, and not really protectable without breaking the
game:** category labels (plain text, the player has to read them) and the
full character roster (`/api/items`) are both public. A determined client
could fetch both and compute valid answers client-side without ever
touching the server's `cellSolutions`. This is inherent to the genre, not a
gap specific to this implementation — every grid game with a public dataset
has this property. The actual guarantee this system provides is "don't hand
the answer key over the network for a specific puzzle instance," not
"prevent all possible client-side reconstruction."
 
**Real, deferred gaps** (not urgent for single-player, become requirements
in Phase 3 H2H where a client can't be trusted):
- No rate limiting on `/guess` — a script could brute-force a cell's answer
  set via repeated correct/incorrect responses.
- No server-side tracking of which answers a player has already used in a
  given puzzle session — currently fine to handle client-side for
  single-player (a player isn't adversarial against themselves), but must
  move server-side once an opponent is involved.
### CORS
 
`@CrossOrigin(origins = "http://localhost:5173")` on both controllers,
matching Vite's default dev port. Will need a real allowed-origins
configuration (not hardcoded per-controller) once deployed.
 
## Package structure (backend)
 
```
com.tonyl.backend
├── BackendApplication.java
├── api/              — REST controllers + request/response DTOs
├── domain/            — JPA entities (GridItem, Puzzle, CategorySnapshot)
├── repository/         — Spring Data JPA repositories
├── game/               — CategoryDefinition, GameModule, GenshinGameModule, BrawlStarsGameModule
├── puzzle/             — GridGenerator, PuzzleService
└── loader/             — one-time data loaders (CommandLineRunner, profile-gated)
```
 
`domain`/`repository`/`api` are fully game-agnostic. `game/GenshinGameModule`
is the only class in the codebase with Genshin-specific knowledge — Phase 2
(adding a second game) is specifically designed to prove that adding
`game/SlayTheSpireGameModule` requires zero changes elsewhere.
 
## Why this scales to additional games
 
All engine code (grid generator, solver, persistence, API routes) is
written once against `GridItem`/`CategoryDefinition`/`GameModule` and takes
`gameId` as a parameter. Game-specific logic lives only inside a
`GameModule` implementation and its ingestion script. Phase 2 exists to
prove this claim empirically rather than leave it as an unverified design
intention.
 
## Backlog (non-blocking)
 
- Backfill ~26 missing Genshin characters (patch 5.1+) not present in the
  current data source.
- Add `release_version` (e.g. "4.2") via a date → patch-version lookup
  table; not present in the current data source.
- Add character model/body type as an attribute — requires a second data
  source (likely Fandom wiki), not available from the current API.
- Frontend: map category values (element, region, etc.) to icon assets for
  display rather than plain text.
- Tighten grid generation to reject overly-easy (1-answer) or
  low-variety (one character satisfying many cells) combinations.
- Real `GameModule` registry (currently a hardcoded if-check in
  `PuzzleService.resolveModule()`) — deferred until a second `GameModule`
  actually exists (Phase 2), to avoid premature abstraction.
- Rate limiting and server-side used-answer tracking on `/guess` — required
  before Phase 3 (real-time H2H), not urgent for single-player.
- CORS origins should move to configuration rather than a hardcoded
  annotation value once a deployment target exists.
  - Multi-variant entity disambiguation: any GameModule with entities sharing
  a display name but differing by a key attribute (e.g. Genshin's Traveler,
  one entity per element) must disambiguate display_name at normalize time,
  since raw source data often differentiates IDs/attributes but not names.
- Real `GameModule` registry — `PuzzleService.resolveModule()` and
  `GameDataLoader.GAME_SEED_FILES` are both still hardcoded lookups (a
  switch statement and a static Map respectively). Two games proved the
  abstraction; a proper registry (e.g. a Spring `Map<String, GameModule>`
  bean, or filesystem/config-driven discovery) is still a reasonable next
  step once a third game is added or this is deployed.
- Expand Brawl Stars attribute set (e.g. Super/Star Power count) for
  richer category variety — separate from, and not a substitute for, the
  GridGenerator dimension-partitioning fix.
- Brawl Stars rarity color mapping for CategoryChip — BrawlAPI returns a
  `color` hex value per rarity that wasn't captured at ingestion; currently
  falls back to the generic gray chip style.
- BrawlAPI class-metadata gap (see Data sourcing above) — revisit when
  backfilling.
