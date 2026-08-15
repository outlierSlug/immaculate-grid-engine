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
| Frontend   | React 19 + TypeScript + Vite + Tailwind  | `react-router-dom` v7 for routing, no data-fetching library (plain `fetch` + local state) |
 
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
- **`spring.jpa.hibernate.ddl-auto=update` only ever ADDs — it never drops
  constraints or backfills data.** This project has no Flyway/Liquibase, so
  it's the only schema mechanism, and it bit twice adding `Puzzle.mode`
  (DAILY/UNLIMITED) for Unlimited mode:
  - Removing a `@UniqueConstraint` from the entity does nothing to an
    already-existing DB index — the stale constraint keeps rejecting
    inserts until manually dropped (`ALTER TABLE ... DROP CONSTRAINT ...`
    via `docker exec grid-postgres psql ...`).
  - A new `NOT NULL` column fails outright against a non-empty table
    (`ddl-auto=update` can't backfill). Add it nullable, backfill existing
    rows explicitly (`UPDATE ... SET col = 'X' WHERE col IS NULL`), and
    make sure every code path that writes the entity sets it going forward.
  Rule of thumb: never assume `ddl-auto=update` reconciled a schema
  change — check the running dev Postgres directly before relying on it.
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
 
- `id`: `"{gameId}:{date}"` for Daily puzzles (e.g. `"genshin:2026-08-06"`)
  or `"{gameId}:unlimited:{uuid}"` for Unlimited puzzles — natural key,
  makes "does today's puzzle already exist" a single lookup.
- `mode`: `PuzzleMode` enum, `DAILY` or `UNLIMITED`. Nullable at the DB
  level (see the `ddl-auto=update` gotcha above) — legacy pre-Unlimited-mode
  rows are backfilled to `DAILY`; every row written by current code always
  sets it explicitly. `PuzzleRepository.findByGameIdAndPuzzleDateAndMode`
  is scoped by mode because Unlimited puzzles also carry today's date as
  metadata (for display/debugging), so a lookup by `(gameId, puzzleDate)`
  alone would return multiple rows once same-day Unlimited puzzles exist.
- `rowCategories` / `colCategories`: `List<CategorySnapshot>` (id + label
  only — snapshots of the categories chosen at generation time, not live
  `CategoryDefinition` objects, since those are logic and can't be
  persisted directly).
- `cellSolutions`: `Map<String, List<String>>`, keyed `"row-col"` (e.g.
  `"0-0"`), valued with the list of valid `GridItem` ids for that cell.
  **Never serialized into any API response** — see Security below.
- No DB-level unique constraint on `(gameId, puzzleDate)` — removed when
  Unlimited mode shipped, since it's redundant with the PK for Daily rows
  (the id already encodes the date) and would otherwise block multiple
  same-day Unlimited rows.
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
- **Genshin roster data is now manually curated, not scraped by
  `fetch_genshin.py`** — `ingestion/genshin/raw/genshin_characters.json` was
  hand-assembled from the Genshin wiki. Only `normalize_genshin.py` (raw →
  `GridItem` schema) should be edited for data-shape/attribute fixes; the
  raw file itself is out of band.
- **Real bug found and fixed**: `normalize_genshin.py` generates one
  `GridItem` per Traveler element/gender combination
  (`traveler-{gender}-{element}`), but every element inherited the base
  Traveler record's single `release_version` ("1.0"). This is wrong —
  each element unlocked in a different patch, so `release_version` (a live
  puzzle category dimension) could generate genuinely impossible puzzles,
  e.g. "1.0 × Dendro" when Dendro didn't exist until 3.0. Fixed via a
  hand-curated `TRAVELER_ELEMENT_RELEASE_VERSION` map in the script (Anemo/
  Geo 1.0, Electro 2.0, Dendro 3.0, Hydro 4.0, Pyro 5.3 — quest-locked
  behind the Natlan Archon Quest finale, not Natlan's 5.0 launch — Cryo
  7.0), since the raw source only ever carried one `release_version` for
  the base character. Same class of issue as the Mualani casing bug above:
  a real-world data nuance the generic ingestion schema had no way to
  represent until someone hit it in an actual puzzle.
- **Reload procedure** after any `normalize_genshin.py` fix: `python
  normalize_genshin.py` → copy `output/genshin_entities.json` over
  `backend/src/main/resources/genshin_entities.json` → recompile → run the
  backend once with `-Dspring-boot.run.profiles=load-data` (upserts
  `grid_items` by id, safe to re-run, no wipe needed) → **also `TRUNCATE
  TABLE puzzles`**, since existing puzzle rows snapshot `cellSolutions`
  computed against the old attribute values and won't self-correct.

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
 
1. Pull all `CategoryDefinition`s for the game (from its `GameModule`),
   optionally pre-filtered by dimension/category id (Unlimited mode's
   settings panel — see below).
2. Seed the RNG. Two overloads: `generate(entities, categories, date)`
   seeds with `date.toEpochDay()` — deterministic, so the same date always
   produces the same shuffle, which is what makes "today's puzzle"
   reproducible from the date alone without persisting a seed. `generate(
   entities, categories, long seed, int minAnswersPerCell)` takes an
   arbitrary seed (Unlimited mode passes a random one per generation) and
   a configurable per-cell answer-count floor (Unlimited's "Allow
   single-answer cells" setting: 1 when allowed, 2 when not). The date
   overload delegates to the seed overload with `minAnswersPerCell=1`, so
   Daily's behavior and `GridGeneratorTest`'s invariants are byte-for-byte
   unchanged.
3. Group categories by dimension, shuffle the *dimensions* (not individual
   categories), split at a random point into a row-dimension group and a
   col-dimension group, then shuffle and take 3 categories from each
   group's pooled categories.
4. For each of the 9 row×col pairs, compute the valid-answer set by
   filtering `GridItem`s against both predicates.
5. If any cell has fewer than `minAnswersPerCell` matches, discard the
   combination and retry (bounded retry loop, currently 500 attempts)
   rather than surfacing a broken puzzle.
6. Return `Optional<GeneratedPuzzle>` — empty if no valid combination was
   found within the attempt budget. Callers must handle this explicitly;
   with a roster this size, an unsolvable combination (especially under
   Unlimited mode's user-chosen filters) is a real possibility, not a
   hypothetical edge case.
7. On success, the caller (`PuzzleService`) snapshots the chosen categories
   and persists the `Puzzle`.

**Known quality gap, not a correctness bug**: step 3 pools *all* categories
across every dimension assigned to a side and shuffles them together, so
if a dimension-group happens to contain few dimensions (or the shuffle
just favors one), all 3 row (or column) categories can legitimately end up
drawn from the same single dimension — e.g. all 3 columns being different
character models. Puzzles generated this way are still fully correct
(every invariant `GridGeneratorTest` checks holds), just less varied than
they could be. Fixing this means preferring distinct dimensions per side
when enough are available (falling back to repeats only when there aren't)
— see Backlog.
 
## API design and security
 
Controllers:
 
- `GET /api/puzzle/today?game=genshin` → today's puzzle, category labels
  only (`rowLabels`, `colLabels`). Backed by `PuzzleService.
  getOrCreateTodaysPuzzle()`: look up by `(gameId, date, mode=DAILY)`,
  generate + persist only if missing.
- `POST /api/puzzle/unlimited?game=genshin` → generates and persists a
  fresh Unlimited-mode puzzle every call (never a lookup), body is
  `UnlimitedPuzzleRequest { dimensions?, excludedCategoryIds?,
  minAnswersPerCell? }`. `PuzzleService.generateUnlimitedPuzzle` filters
  the module's category list by the request, 400s if fewer than 2
  dimensions remain, and generates with a random seed. Same response
  shape as `/today` (`PuzzleResponse`).
- `POST /api/puzzle/{puzzleId}/guess` → `{ row, col, itemId }` in,
  `{ correct, itemId, displayName, imageUrl }` out. Validates by looking up
  the persisted `cellSolutions` for that cell; never returns the solution
  set itself, only whether the specific submitted guess was correct.
  Mode-agnostic — works identically for Daily and Unlimited puzzle ids.
- `GET /api/games/{game}/categories` → every category the game offers,
  grouped by dimension (`{gameId, dimensions: [{dimension, categories:
  [{id, label}]}]}`). Exists purely to drive Unlimited mode's settings
  panel generically — the frontend never hardcodes a game's dimension
  names.
- `GET /api/items?game=genshin` → full character roster (id, name, image,
  attributes). Deliberately fully public — unlike puzzle solutions, the
  roster itself is meant to be public (the player is tested on recall
  against public data, same as the wider genre works: Pokedoku's Pokemon
  data is public too).

`ApiExceptionHandler` (`@RestControllerAdvice`) maps `IllegalArgumentException`
→ 400, `NoSuchElementException` → 404, `IllegalStateException` → 409 —
added alongside the Unlimited endpoints so filter-validation and
generation-failure errors return a real status + message instead of a raw
500. `GameModuleRegistry` (`@Component`) centralizes the `gameId →
GameModule` switch that used to be duplicated logic in `PuzzleService`
only; `GameController` now shares it. It's still a hardcoded switch
internally, not the registry pattern described in Backlog — this only
removed the duplication, not the hardcoding.
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
once real-time H2H exists, where a client can't be trusted):
- No rate limiting on `/guess` — a script could brute-force a cell's answer
  set via repeated correct/incorrect responses.
- No server-side tracking of which answers a player has already used in a
  given puzzle session — currently fine to handle client-side for
  single-player (a player isn't adversarial against themselves), but must
  move server-side once an opponent is involved. The planned 9-guess-limit
  feature (see Roadmap) is intentionally scoped the same way: a
  client-side-only counter for now, matching this exact reasoning, not a
  server-authoritative rule yet.
### CORS
 
`@CrossOrigin(origins = "http://localhost:5173")` on both controllers,
matching Vite's default dev port. Will need a real allowed-origins
configuration (not hardcoded per-controller) once deployed.
 
## Frontend architecture

Routes (`react-router-dom` v7, `<Routes>`/`<Route>`, not the data-router
API): `/` (game select) → `/:game` (Daily) → `/:game/unlimited`
(Unlimited). A shared `Layout` renders `Header` + `<Outlet/>`; `Header`
reads `useParams()`/`useLocation()` to know the active game and mode for
its Daily/Unlimited toggle and Settings (game-switch) modal.

**Shared puzzle-play state**: `usePuzzleGuesses(puzzle, options)` (a hook,
not a component) owns `filledCells`/`activeCell`/guess-submission for both
Daily and Unlimited — resets when `puzzle.id` changes (or restores from
localStorage, see below), and derives `correctCount`/`totalCells`/
`isComplete` purely from `filledCells.length` vs. `rowLabels.length *
colLabels.length`. This is what lets `PuzzlePage` and `UnlimitedPage`
share one implementation of "fill a cell, validate a guess" while
differing only in *how the puzzle was obtained* (fetch vs. generate) and
which options they pass:
- `guessLimit` — Unlimited passes a runtime-toggleable value (or `null`
  for unlimited guesses); Daily always passes a fixed `9`, no toggle, no
  settings surface. Deliberate difference, not an oversight: Daily is the
  same fixed challenge for every player (genre convention, matches
  Pokedoku), Unlimited is a sandbox.
- `persistKey` — only Daily passes one (see localStorage below); Unlimited
  passes nothing and stays in-memory-only, unaffected by the option's
  existence.

**Non-blocking guess feedback**: every guess produces a
`feedback: { row, col, correct }` value on the hook, cleared ~400ms later
by the hook itself. This single value drives three simultaneous visual
reactions from one source, deliberately not three independently-timed
ones: `PuzzleGrid` flashes the guessed cell's border green/red instead of
a blocking `alert()`, and `Score`/`GuessCounter` each play a one-shot
scale "pop" (`GuessCounter` on any guess, since an attempt is consumed
either way; `Score` only when `feedback.correct` is true, since score
didn't actually change on a wrong guess). The pop is a real CSS
`@keyframes` animation (`index.css`), not a two-state `transition` —
toggling between two `scale-*` classes on a held boolean visibly paused
at the peak scale for as long as `feedback` stayed truthy; a keyframe
interpolates continuously through the peak with no plateau, and is
triggered by bumping a remount-`key` inside `useLayoutEffect` (not
`useEffect`) so it starts in the same paint as the border-flash class
change rather than potentially trailing it by a frame.

**Timer** is driven by wall-clock timestamps (`startedAt`/`endedAt` epoch
ms, both owned by `usePuzzleGuesses`), not an accumulated counter —
elapsed time is always computed as `(endedAt ?? Date.now()) - startedAt`.
This is what makes it trivially refresh-safe and correctly frozen at the
true end time: there's no internal ticking state to lose on remount, just
two numbers to persist (or not, for Unlimited).

**Daily's localStorage persistence** (`usePuzzleGuesses`'s `persistKey`
option): when set, `filledCells`/`guessesUsed`/`gaveUp`/`startedAt`/
`endedAt` are saved on every meaningful state change and restored on
mount instead of resetting. Keyed by `puzzle.id`, which already encodes
the date (e.g. `"genshin:2026-08-14"`) — a stale prior-day entry simply
lives under a different, never-again-matched key, so no manual
date-comparison/invalidation logic is needed.

**"Keep Playing"**: after a non-solved game-over (out of guesses or gave
up, with cells still empty — never offered after a full solve), an
optional button unlocks the board for further exploration. Fills made
this way go into a separate `freeplayCells` bucket, merged into what's
*displayed* but never into `filledCells` itself — so `Score`/
`correctCount` stay frozen at the true end-of-game value, and none of it
gets persisted (a refresh reverts to the frozen official state).

**`PuzzleGrid`** renders as a single CSS Grid (not nested flex rows) with
an explicit `gridTemplateColumns`/`gridTemplateRows`, and always reserves
a trailing column the same width as the row-label column via an optional
`sideColumn?: ReactNode[]` prop (index-aligned to rows) — even when
nothing is passed for it. This was a deliberate fix: an earlier version
only reserved that column when it had content, so the 3x3 grid visibly
drifted off-center depending on whether Unlimited's Timer was showing.
Reserving it unconditionally makes the middle cell's horizontal center
content-independent, verified to be pixel-identical across Daily,
Unlimited-with-Timer, and Unlimited-without-Timer. `CategoryChip`'s
plain-text pill wraps to two lines (`max-w-24`, no `whitespace-nowrap`)
instead of overflowing into the grid for long labels like "Medium
Female" — a filled cell's own name pill does the same for the same
reason: a `truncate`+`justify-center` combination was found to clip long
names like "Sangonomiya Kokomi" symmetrically from *both* ends rather
than ellipsizing one end, since `text-overflow: ellipsis` doesn't behave
as a simple one-sided cutoff once the overflowing content is centered.

**Unlimited mode** (`UnlimitedPage` + `UnlimitedSettingsPanel`):
- Settings model is `{ excludedCategoryIds, allowSingleAnswers,
  showTimer, unlimitedGuesses, softLockGuard }` — no separate "included
  dimensions" list, since a dimension with zero remaining checked values
  is already excluded by construction. `UnlimitedPuzzleRequest.dimensions`
  is never sent from the frontend; `excludedCategoryIds` alone does all
  the filtering.
- Settings are **live, not staged** — `UnlimitedSettingsPanel` is fully
  controlled (`settings`/`onChange` props, no internal draft), so editing
  via the hamburger-opened modal writes straight into page state; closing
  it never discards anything. The page-level Generate button is the only
  way to (re)generate, and neither the inline nor modal settings card owns
  one.
- Dimension chips are trigger-only — clicking one opens a `DimensionOverlay`
  (an "All" toggle + per-value checkboxes as a secondary modal); the chip
  itself never includes/excludes anything.
- On generation failure (e.g. filters too narrow), the page always reverts
  to the loadup/settings screen and shows the backend's actual error text
  (`generateUnlimitedPuzzle` reads `res.text()` on failure) — never leaves
  a stale grid on screen with an error floating above it.

**Known gap**: switching Daily ↔ Unlimited via the header toggle discards
in-progress state (a generated Unlimited puzzle, filled cells). Daily's
own *refresh* survives via localStorage now, but a mode-switch-and-back
still does not carry state either direction. Acceptable for now, flagged
in Backlog as a real UX gap for later.

## Package structure (backend)
 
```
com.tonyl.backend
├── BackendApplication.java
├── api/              — REST controllers, request/response DTOs, ApiExceptionHandler
├── domain/            — JPA entities (GridItem, Puzzle, PuzzleMode, CategorySnapshot)
├── repository/         — Spring Data JPA repositories
├── game/               — CategoryDefinition, GameModule, GenshinGameModule,
│                         BrawlStarsGameModule, GameModuleRegistry
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
See Roadmap for phase sequencing — everything here is non-blocking,
listed flat rather than pre-sorted into a "next up" since that ordering
kept going stale faster than the items themselves resolved.

- Additional category dimensions (candidates: affiliation, birthday
  month — both already present in raw ingested data, unused so far).
- Wordle-style shareable result summary — common genre expectation for a
  once-a-day puzzle, not yet scoped in detail.
- Tighten grid generation to reject overly-easy (1-answer) combinations —
  now user-configurable in Unlimited mode via "Allow single-answer cells"
  (`minAnswersPerCell`); Daily still always allows them.
- Real `GameModule` registry — `GameModuleRegistry` now centralizes the
  `gameId → GameModule` lookup (previously duplicated between
  `PuzzleService` and the new `GameController`), but it's still a
  hardcoded switch internally, not the config/filesystem-driven registry
  originally envisioned. Worth revisiting once a third game is added.
- Rate limiting and server-side used-answer tracking on `/guess` — required
  before real-time H2H, not urgent for single-player.
- CORS origins should move to configuration rather than a hardcoded
  annotation value once a deployment target exists.
- Multi-variant entity disambiguation is a general pattern, not a one-off:
  any GameModule with entities sharing a display name but differing by a
  key attribute (e.g. Genshin's Traveler, one entity per element) must
  disambiguate display_name (and now, as the release_version bug showed,
  any per-variant attribute) at normalize time, since raw source data often
  differentiates IDs/attributes but not names.
- Expand Brawl Stars attribute set (e.g. Super/Star Power count) for
  richer category variety — separate from, and not a substitute for, the
  GridGenerator dimension-variety fix above.
- Brawl Stars rarity color mapping for CategoryChip — BrawlAPI returns a
  `color` hex value per rarity that wasn't captured at ingestion; currently
  falls back to the generic gray chip style.
- BrawlAPI class-metadata gap (see Data sourcing above) — revisit when
  backfilling.
- Cross-mode state persistence (Daily ↔ Unlimited navigation via the
  header toggle) — Daily's own page-refresh persistence shipped in
  Phase 5 (`usePuzzleGuesses`'s `persistKey`), but switching modes and
  back still discards in-progress state on both sides; Unlimited has no
  persistence at all (by design, given its puzzles are ephemeral/
  regenerable). See "Known gap" above.
- Deterministic resilience for Daily generation — `generateAndSave` makes
  one single date-seeded attempt with no retry/fallback, unlike Unlimited's
  seed-retry + `findAllValidGrids` exhaustive fallback. Deliberately not
  implemented: `GridGeneratorTest` already verifies >90% generation success
  across 365 simulated dates for both games, and no actual failure has been
  observed in practice — speculative hardening for a problem with no
  observed occurrence. If ever revisited, any fallback must stay a pure
  function of the date (e.g. deterministically-derived fallback seeds, a
  date-seeded pick from `findAllValidGrids`) to preserve the "same date
  always produces the same puzzle" guarantee `singleDeterministicPuzzleIsReproducible`
  depends on — a straight port of Unlimited's `ThreadLocalRandom`-based
  retry would break that.
