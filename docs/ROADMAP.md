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

## Phase 4 — Finish Unlimited Mode [COMPLETE]
Goal: the two known, deliberately-scoped-out gaps from Phase 3.

- [x] 9-guess limit — Immaculate-Grid-genre convention: one shared pool
      across all 9 cells (every submitted guess consumes one, right or
      wrong, not per-cell/not wrong-guesses-only). Client-side only
      (`usePuzzleGuesses`'s `guessLimit` option), "Unlimited Guesses"
      toggle in settings (default on), Give Up button, board locking on
      game-over (`PuzzleGrid`'s `locked` prop). Themed `GuessCounter`
      (Genshin's Acquaint Fate icon for Unlimited; Intertwined Fate
      reserved for Daily in Phase 5). End-state messaging deliberately
      left unstyled — locking/timer-stop logic is fully wired, no visible
      copy yet.
- [x] Soft lock guard — found a real generated puzzle that was unsolvable
      (one entity was the only valid answer for two cells at once, so no
      full 9-cell assignment existed even though every cell individually
      had an answer). Added a bipartite maximum-matching check
      (`GridGenerator.hasPerfectMatching`, Kuhn's algorithm) — mandatory
      for Daily, optional toggle for Unlimited (default on).
- [x] `GridGenerator` puzzle variety — empirically tuned rather than
      hardcoded: measured the real baseline distribution first, tried and
      rejected two variants that didn't hold up under statistical testing
      (uniform dimension-sampling killed release_version's presence;
      full-budget exploration didn't move the needle enough to justify
      10x the cost), landed on a balanced dimension-split (weighted away
      from splits that strand a side with only one dimension) plus
      adaptive probabilistic rejection of monodimensional sides. Cut
      "either side monodimensional" from 65.3% to 42.3% on Genshin's full
      dimension set while keeping per-dimension shares close to baseline
      and success rate above 97%.
- [x] Narrow-filter generation failures — heavily filtered Unlimited
      requests (e.g. 2 dimensions including release_version) could fail
      generation outright. Root-caused to valid grids being real but
      statistically rare for random sampling to land on (as few as 9
      valid combinations out of 200K+ possible). Fixed with a seed-retry
      loop plus `GridGenerator.findAllValidGrids`, a guaranteed-correct
      exhaustive fallback (per-category match caching keeps it fast
      enough to run synchronously) — generation now only fails when a
      filter combination is truly impossible, not from bad luck.

## Phase 5 — Daily puzzle depth & polish [COMPLETE]
Goal: Daily is the most important surface in this genre (the thing a
player returns to once a day) and it hasn't had a dedicated pass since
Phase 1 — everything built for Unlimited in Phase 3 should land here too.

- [x] Wire `Timer`/`Score` into `PuzzlePage`, plus a mandatory (no toggle,
      genre convention, matches Pokedoku) 9-guess limit, Give Up, and board
      locking on game-over — same `usePuzzleGuesses` hook Unlimited uses.
      Completion *messaging* deliberately stayed unstyled, matching
      Unlimited's own still-unstyled end state (see Backlog) — this phase
      wired the same invisible completion state, not new copy/UI.
- [x] "Keep Playing" — once a non-solved game-over is reached (out of
      guesses or gave up, cells still empty), an optional button unlocks
      the board for further exploration without touching the frozen
      official score or persisting anything from that exploration.
- [x] Apply the Phase 4 generation-variety work to Daily — turned out to
      already be automatic (`GridGenerator.generate()`'s date-seeded
      overload shares the same algorithm Unlimited uses), no separate
      change needed
- [x] localStorage persistence for Daily's in-progress puzzle state
      (survives a refresh) — keyed by `puzzle.id`, which already encodes
      the date, so a stale yesterday entry is naturally orphaned rather
      than needing manual invalidation. Persists `filledCells`,
      `guessesUsed`, `gaveUp`, and wall-clock `startedAt`/`endedAt`
      timestamps (not an accumulated counter) so the timer both survives a
      refresh and freezes at the correct final time. Cross-mode (Daily ↔
      Unlimited navigation) persistence explicitly NOT included — see
      Backlog.
- [x] General UI polish: replaced `alert()`-based wrong-guess feedback with
      a non-blocking green/red cell-border flash, synced with a scale-pop
      keyframe animation on `Score`/`GuessCounter` (pop-in fast, pop-out
      slow, `useLayoutEffect`-timed to start in the same paint as the
      border flash). Also fixed a real cell-rendering bug found along the
      way: long names like "Sangonomiya Kokomi" were being clipped on
      both ends (a `truncate`+`justify-center` combination clips
      symmetrically rather than ellipsizing one end) — now wraps to two
      lines instead, matching `CategoryChip`'s existing long-label pattern.

Three smaller items originally scoped for this phase moved to Backlog
instead of blocking it: additional category dimensions, a shareable
result summary, and cross-mode navigation persistence — none affect
Phase 6, and none needed the dedicated-pass urgency the rest of this
phase did.

## Phase 6 — Guess stats & deployment [COMPLETE]
Goal: ship the daily puzzle as a real, live, playable product with the
rarity/uniqueness mechanic that makes this genre engaging.

- [x] Anonymous session identifier (client-generated UUID, localStorage)
      — no real auth needed for this
- [x] `puzzle_attempts` table: one row per finished session per puzzle
      (write-once at game-over), not a per-guess event log — every stat
      needed is a GROUP BY over finished attempts. Daily only.
- [x] `GET /api/puzzle/{id}/stats`: live per-cell answer distributions
      (aggregation), games played, average score, and "Most Unique" —
      all recomputed from scratch on every call, nothing cached.
- [x] Live in-grid rarity % badge on filled cells during play (not gated
      to post-game-over), sourced from the endpoint above — fetched on
      load and again after every correct guess.
- [x] Uniqueness score: an original formula (900 minus rarity-weighted
      deductions per correctly-filled cell, lower = more unique — exact
      formula not publicly documented by Pokedoku, so we defined our
      own). See docs/ARCHITECTURE.md's Phase 6 section for the formula
      and why it's recomputed live rather than stored.
- [x] Percentile ranking: computed entirely client-side
      (`utils/uniqueness.ts`), against a raw `uniquenessScores` list on
      `PuzzleStatsResponse` (every finished attempt's live score, no
      session ids) — not stored per-session server-side. This is what
      lets the same percentile formula work for a live, still-in-progress
      score and not just a submitted one; superseded an earlier version
      that computed it server-side into `you.uniquenessPercentile`, which
      only worked post-submission.
- [x] Post-completion Puzzle Stats panel (`PuzzleStatsPanel`): games/avg
      score/most unique cards, a Most/Least-Common replica board
      (`PuzzleStatsBoard`), shown below the grid once a game ends. No new
      endpoint — entirely powered by the `/stats` response already built.
- [x] Community Answers modal (`CommunityAnswersModal`): click a cell in
      the replica board → full breakdown of every answer and its share
      (bar width scaled directly to that answer's own percent, so a
      50/50 split renders as two half-filled bars, spanning the row's
      full width beneath a name-left/percent-right header line),
      highlighting your own pick with a marker icon (not a recolored
      row/bar — keeps the bar's color meaning "share," not "yours"). Also
      shows every still-valid answer for a cell even at 0 picks (not just
      ones someone's actually chosen) once the viewer has completed the
      puzzle themselves — gated server-side (not just the frontend hiding
      the panel) so `Puzzle.cellSolutions` is never exposed to a caller
      who hasn't earned it. See ARCHITECTURE.md's security section.
- [x] Scores distribution modal (`ScoreDistributionModal`, bar chart of
      final scores across all attempts, your bar a darker blue against
      light-blue others, no "You" label needed). Time-based stat ("solved
      faster than X% of players") not built — deferred, no user ask yet.
- [x] Uniqueness Score modal (`UniquenessModal`, opened from the "Most
      Unique" stat card): plain-language explanation of the formula plus
      a distribution chart bucketed into 100-wide score ranges (0-100,
      100-200, ... 800-900) — the 0-900 range is too wide for a per-value
      bar like the Scores modal's 0-9.
- [x] Live `UNIQ` stat during play, not just post-completion: `PuzzlePage`'s
      side column now shows `UniquenessScore` (click for a small dismissible
      tooltip with your live score + percentile) in the slot `Timer` used to
      occupy — `Timer` was dropped from Daily's display to make room (still
      used by Unlimited, component untouched). Superseded a standalone
      `RankModal`, since a modal was more than what "click for a tooltip"
      called for. See Backlog for re-adding the Timer later (e.g. as a
      toggle, or turning solve time into its own puzzle stat).
- [x] Mobile responsiveness pass: the grid/stats-board/Unlimited button-row
      sizing was fixed-`rem` (38rem total, wider than any phone) and
      overflowed on narrow viewports — row category chips pushed
      off-screen, side-column stats clipped. Fixed with `clamp()`-based
      fluid sizing (`utils/gridSizing.ts`, shared by every grid-shaped
      layout so they all stay aligned) that's pixel-identical to the old
      fixed sizing above ~610px wide, plus capped every modal's width to
      the viewport. Verified against a real iPhone 15 Pro Max viewport
      (430px) and confirmed no regression at desktop widths. `Header`'s
      own title-clipping, and a deeper mobile grid/dark-mode/brand-identity
      pass, were done in a later post-Phase-6 session — see
      docs/ARCHITECTURE.md's "Design system, dark mode, and the
      header/grid rework".
- [x] Config/secrets hygiene — DB credentials and CORS origins
      externalized to env vars (`DB_PASSWORD` with no default so startup
      fails fast, `CORS_ALLOWED_ORIGINS`), `config/WebConfig.java`
      centralizes CORS instead of 3 duplicated `@CrossOrigin`
      annotations, `pg_hba.conf` fixed from `trust` to `scram-sha-256`
      (the DB password was never actually being checked locally). The
      real prod origin (gachagrid.com) was added to `CORS_ALLOWED_ORIGINS`
      when Phase 7.5's deploy actually happened.
- [x] Deploy backend (Render, Docker runtime) + frontend (Cloudflare
      Workers static assets) + managed Postgres (Neon) — live at
      gachagrid.com since 2026-08-24. Diverged from this phase's original
      Fly.io/Railway + Vercel/Netlify sketch: Render has no native Java
      runtime (Docker required instead of a buildpack), and Cloudflare
      Workers' own SPA-fallback handling collided with a leftover
      Pages-style `_redirects` file (removed) — the domain being already
      on Cloudflare made Workers the natural fit for the frontend once
      Pages was reconsidered. See Phase 7.5 for the deploy-adjacent
      hardening and launch polish that followed.

## Phase 7 — Accounts, Archive & launch polish [COMPLETE]
Goal: turn the anonymous-only single-player game into one with real
accounts, replayable history, and a shipped visual identity — the last
stretch of feature work before Phase 6's sole remaining item
(deployment) is the only thing left.

- [x] Google OAuth sign-in (`AuthController`, `auth/` package) — opaque
      bearer session tokens (`UserSession`, not a JWT — trivial
      revocation, no signing-key management), a short-lived single-use
      exchange code handed back in the OAuth redirect's URL fragment
      (never the real token, never a server access log) that the
      frontend immediately trades for the real token via `POST
      /api/auth/exchange`, and an account-chooser prompt so switching
      Google accounts on the same device doesn't require signing out of
      Google first. Spring Security is used minimally — only for the
      actual Google code-exchange dance; a custom
      `CurrentUserArgumentResolver` resolves `@CurrentUser User`/
      `Optional<User>` controller params from the `Authorization: Bearer`
      header for everything else.
- [x] Ownership enforcement on the existing anonymous `sessionId` field —
      a signed-in user's identity flows through the same opaque
      `sessionId` string Phase 6's stats engine already treats as opaque
      (`"user:{id}"`), so that engine needed zero changes. But unlike a
      random anonymous UUID, a sequential user id is guessable — closed
      by having `PuzzleStatsService` reject any `"user:"`-prefixed
      `sessionId` that doesn't match the caller's own resolved identity.
- [x] Archive mode (`ArchiveListPage`, `/:game/archive/:date`) —
      signed-in players can replay any of the last 30 days' Daily
      puzzles, reusing `PuzzleService.getOrCreateForDate` (a
      generalization of the existing `getOrCreateTodaysPuzzle`).
      Archived completions count toward community pick-rate stats (same
      as any attempt) but are excluded from personal games-played/
      avg-score via a new `PuzzleAttempt.playedLive` flag.
- [x] Profile page (`ProfilePage`) — per-game stats (games played, avg
      score, avg uniqueness computed client-side by re-running the one
      `computeLiveUniquenessScore` formula per recent puzzle), links to
      each game's archive, and a Delete Account flow (`DELETE
      /api/auth/me` hard-deletes the user + every session; past
      `puzzle_attempts` stay as anonymized community stats, same
      treatment anonymous play always had).
- [x] `PuzzleClock` pins "today" to `America/Los_Angeles` explicitly
      (was an implicit JVM-default timezone); an in-progress Daily
      puzzle left open across the midnight rollover now auto-finalizes
      as a gave-up attempt (only if guesses were actually used) instead
      of silently discarding it when the new day's puzzle swaps in.
- [x] Fixed the UNIQ score/percentile formulas to use leave-one-out
      sampling, so a player's own pick no longer counts toward "how
      common is my own pick" — fixed a real skew/tie issue that showed
      up with only a couple of attempts recorded on a puzzle.
- [x] Contextual (i) help buttons on Daily/Unlimited/Archive explaining
      each mode.
- [x] Site footer (`Footer.tsx`) + Fan Content & Privacy page
      (`/legal`) — verbatim Supercell Fan Content Policy wording (a
      compliance requirement, not house copy — do not paraphrase it),
      a real Privacy section, sticky-footer layout.
- [x] Rebrand to **GachaGrid** (user-facing name only; repo/engine name
      unchanged — see `docs/ARCHITECTURE.md`'s Overview) plus a UX
      polish pass: confirm-guarded Give Up buttons, auto-refetch of the
      Daily puzzle on tab focus/visibility (catches the midnight
      rollover for a still-open tab), branded 404 page, loading
      skeletons, modal entrance animations.
- [x] Site-wide design pass — `BrandMark` (original SVG glyph), Space
      Grotesk typeface, real dark mode (`ThemeProvider`: context +
      localStorage + system-preference default + a no-flash inline boot
      script), header/grid mobile rework (side stats move below the
      grid on narrow viewports instead of reserving a column).
- [x] Brawl Stars visual pass — brawler class icons, rarity-colored
      chips matching Brawl Stars' own scheme, `brawler_class` backfilled
      for 19 brawlers the API reports as `"Unknown"`.
- [x] Brawl Stars Traits category — a new multi-valued category type
      (`AttributeContainsCategory`, alongside the existing scalar
      `AttributeEqualsCategory`) plus hand-curated trait data for all 39
      trait-bearing brawlers.
- [x] App-wide click-to-reveal tooltip coverage (`ClickTooltip`, shared
      component) on every category chip and puzzle-board stat across
      both games — traits, classes, rarities, regions, elements,
      weapons, release versions, models, star ratings, Score, and
      Guesses Remaining (which now distinguishes "gave up" from "still
      going" in its message).
- [x] Daily-generation reliability fix — `generateAndSave`'s single
      date-seeded attempt with no fallback was measured at only a 58.2%
      success rate for Brawl Stars (3650-day simulation), meaning ~42%
      of days would 500-error. Fixed with the same deterministic
      retry + exhaustive-fallback pattern Unlimited mode already had
      (seeds derived from the date, not real randomness, preserving
      "same date always produces the same puzzle forever"). Verified at
      0/1000 failures for both games post-fix.

## Phase 7.5 — Deployment, hardening & post-launch polish [COMPLETE]
Goal: take the feature-complete app from Phase 7 live at gachagrid.com,
then close the gaps only a real deployment and real usage surface.

- [x] Deployment infra: Render (Docker) backend, Cloudflare Workers
      (static assets) frontend, Neon Postgres. Every environment-specific
      value was already env-var-driven from Phase 6's config hygiene, so
      this was purely additive (`server.port=${PORT:8080}`, `render.yaml`,
      `backend/Dockerfile`, `wrangler.jsonc`). Two real deploy-time bugs
      found and fixed, not just planned for: Render rejected
      `runtime: java` outright (Docker was required instead), and
      Cloudflare Workers' built-in SPA fallback collided with a leftover
      Pages-style `frontend/public/_redirects` file (removed).
- [x] Neon data-seeding: the managed Postgres starts genuinely empty —
      `ddl-auto=update` only creates the schema, not the character
      roster — so `GameDataLoader` (`@Profile("load-data")`) needs a
      manual one-time run against prod credentials. Documented as a
      repeatable procedure in `docs/ARCHITECTURE.md` since every future
      attribute/category addition needs the same reload.
- [x] Security: server-side guess-limit enforcement (`puzzle_guess_counts`
      table, atomic upsert-and-check per `(puzzleId, sessionId)`) —
      previously only the frontend's own counter capped guesses, so a
      scripted client could brute-force every cell's answer and pollute
      community pick-rate/uniqueness stats with fake perfect runs.
      Shipped with a same-day follow-up fix: `submitGuess` wasn't sending
      its auth header, so every signed-in player's guesses started
      403ing the moment the cap went live.
- [x] Admin puzzle curation/tracking/history (`/admin`, allowlist-gated by
      `ADMIN_EMAILS`; a non-admin gets the same 404 a broken link would,
      never a redirect or "unauthorized" that would itself confirm the
      surface exists): hand-build or generate a future Daily with a live
      per-cell answer-count preview before pinning; roster/dimension-
      pairing appearance-rate tracking (all-time + trailing-30-day,
      sortable, 0-appearance rows kept visible); a read-only History view
      of any past puzzle (not just the public Archive's 30-day window),
      reusing the same stats components a real player sees
      post-completion.
- [x] Self-hosted character icons (Genshin + Brawl Stars) — replaced
      hotlinking Enka Network/Brawlify with build-time-downloaded assets
      under `frontend/public/{game}/icons/`, removing the runtime
      dependency on a third-party CDN; both sources credited on the Legal
      page as a courtesy.
- [x] Archive polish: a launch-date floor (`ARCHIVE_LAUNCH_DATE`) so the
      rolling 30-day window can't fabricate a playable pre-launch date; a
      real empty state instead of a blank page on a fetch failure; score
      display + week grouping in the list view; the in-progress countdown
      removed from the archived-puzzle view (meaningless once the date is
      already fixed in the past).
- [x] Data fix: Brawl Stars `tags` (Former Chromatic/Has Wallbreak/Has
      Hypercharge Skin/Has Legendary Skin) + `release_year` categories —
      closed the last roster-coverage gap from the Phase 4 fairness work
      (2 of 106 brawlers could never appear as a valid Daily answer;
      106/106 after), and pushed Daily generation success from 60.4% to
      99.6%. Bolt's `Has Wallbreak` tag added shortly after as a follow-up
      data correction, alongside an `Ultra Legendary` chip restyle
      (lime-tinted border + gradient text, matching `Former Chromatic`'s
      pattern).
- [x] Genre/UX polish: a confetti celebration on a full 9/9 solve (fires
      once, `motion-safe:`-gated, shared across Daily/Unlimited/Archive
      via the common `usePuzzleGuesses` hook); Unlimited's Timer given the
      same click-tooltip every other board stat already had; a Back
      button on Unlimited's puzzle view; a shareable result button (with a
      same-day fix to the share URL itself); Traveler variant help notes
      added to Genshin's Archive view.
- [x] Growth/ops: `robots.txt` + `sitemap.xml` and Google Search Console
      submission for search indexing; an X/Twitter link in the footer; a
      high-res `BrandMark` export for social profile use; a GitHub
      Actions workflow (`db-backup.yml`) backing up Neon to Cloudflare R2;
      Cloudflare's dashboard security settings reviewed now that
      gachagrid.com is a live public site rather than a parked domain.
- [x] Mobile: a further-tuned row/column category-chip spacing pass
      against the grid (`--grid-label-solo` clamp coefficient +
      directional padding) — a narrower follow-up to Phase 6's
      mobile-responsiveness pass, prompted by a real Android screenshot
      showing the chips still reading as touching the grid. A companion
      font-consistency issue found the same way (`font-mono` resolving to
      a visually different, more jarring face on Android than on desktop)
      was investigated and deliberately left as-is — every fix explored
      would have also changed desktop's already-acceptable font
      rendering, ruled out as not worth that tradeoff.

## Phase 8 — Real-time head-to-head (~2-3 weeks)
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

## Phase 9 — Scale / advanced features
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
  before Phase 8 (H2H), not urgent before then
- ~~CORS origins moved to configuration once a deployment target
  exists~~ — mechanism shipped in Phase 7 (`config/WebConfig.java`,
  `CORS_ALLOWED_ORIGINS`); the real gachagrid.com origin was added when
  the site actually deployed (Phase 7.5).
- ~~Deterministic resilience for Daily generation~~ — fixed in Phase 7:
  `PuzzleService.generateDailyPuzzle` now retries with date-derived
  seeds and falls back to an exhaustive search before giving up,
  closing a measured ~42% single-seed failure rate for Brawl Stars.
- ~~Two Brawl Stars characters (Kaze, Shelly) never appeared as a valid
  Daily answer at all across a 3650-simulated-day fairness check~~ —
  resolved 2026-08-23 as a side effect of the `tags`
  (Former Chromatic/Has Wallbreak/Has Hypercharge Skin/Has Legendary Skin)
  and `release_year` categories: re-run of
  `GridGeneratorTest#characterFairnessReport` shows 106/106 roster coverage
  (was 104/106), Gini 0.252 (was 0.305), and Daily generation success up
  from 60.4% to 99.6% — more dimensions gave `GridGenerator` far more
  row/col pairings to find a valid grid through. Not something that was
  deliberately targeted; caught by re-running the report after unrelated
  category work.
- Animation polish (scoped 2026-08-21, not yet built): distribution-chart
  bars in `ScoreDistributionModal`/`UniquenessModal`/
  `CommunityAnswersModal` snap to full height on open instead of
  animating in; stat numbers (games played, average score in
  `PuzzleStatsPanel`) render final values with no count-up.
- Footer's Contact link — deliberately not built yet; wants a
  Formspree-style form endpoint, not a bare `mailto:` (would expose a
  personal email to scrapers). Left as a `TODO` above `FOOTER_LINKS` in
  `Footer.tsx`.
- ~~Pre-deployment fresh start — reset the Archive so only puzzles
  generated after deployment appear there~~ — superseded in Phase 7.5 by
  the `ARCHIVE_LAUNCH_DATE` floor instead: rather than a destructive
  `puzzles`/`puzzle_attempts` wipe (risky post-launch given the two
  tables have no FK between them and would need deleting together), the
  Archive's rolling window is simply clamped to never offer a date before
  real launch, regardless of what dev/test rows exist underneath.
  Accumulated dev/test data itself is still sitting in prod, just never
  surfaced — a real cleanup pass is still open, see the "Database
  management" item below.
- A user-facing help/about page (`/help`) was built once, then reverted
  the same day at the user's request (no reason recorded) — not
  currently present. Could resurface fresh or by restoring from git
  history if wanted again.
- Multi-variant entity disambiguation (Traveler-style: same display name,
  differing key attributes) is a general ingestion pattern to watch for
  in any future GameModule, not a one-off
- Daily vs. Unlimited should eventually have distinct generation *goals*
  on top of the shared correctness engine, not just shared code: Daily
  optimizes for freshness/interest (monodimensional grids allowed, even
  desirable) with editorial curation in mind, Unlimited optimizes for
  replayability/variety. `generateCandidates()` (Phase 4) is the
  foundation — collects multiple valid grids instead of stopping at the
  first one — but mode-specific *scoring* to choose among them (Unlimited
  diversity scoring, Daily freshness scoring against recent puzzles
  already in the `puzzles` table, a curation tool to preview/hand-pick an
  upcoming Daily) is still unbuilt. No fixed phase — revisit once Daily
  curation is a real priority (Phase 6+).
- Additional category dimensions (candidates: affiliation, birthday
  month — both already present in raw ingested data, unused so far)
- ~~Wordle-style shareable result summary~~ — shipped in Phase 7.5 as a
  share button on a finished puzzle, with a same-day follow-up fix to
  the generated share URL itself.
- Cross-mode state persistence (Daily ↔ Unlimited navigation via the
  header toggle) — Daily's own page-refresh persistence shipped in
  Phase 5, but switching modes and back still discards in-progress state
  on both sides
- Daily's Timer was removed from display (Phase 6) to make room for the
  live `UNIQ` stat in that slot — revisit re-adding it (e.g. behind a
  toggle like Unlimited's) and/or turning solve time into its own puzzle
  stat ("solved faster than X% of players"), same idea already noted for
  the Scores distribution modal
- Database management: no cleanup path for ephemeral rows. Unlimited-mode
  puzzles accumulate forever (every "Generate" click inserts a new row,
  never pruned — 86+ rows from dev testing alone as of Phase 6). Now that
  the site is actually live on Neon (Phase 7.5), this also covers the
  pre-launch dev/test `puzzles`/`puzzle_attempts` rows that were never
  wiped (see the superseded "Pre-deployment fresh start" item above) —
  they're invisible to real players (the Archive's launch-date floor
  hides them) but still sitting in prod and counted in any raw table
  scan. Worth a real answer (scheduled cleanup job, TTL, or a one-time
  manual purge, or similar) before real traffic makes this harder to
  untangle from genuine user data.
- ~~Header polish for narrow viewports~~ — fixed in a later session
  alongside the site's dark mode and brand-identity pass; see
  docs/ARCHITECTURE.md. ~~A footer is still a nice-to-have, not yet
  scoped~~ — shipped in Phase 7 (`Footer.tsx`, `/legal`).
- Real schema migration tool (Flyway) for production, replacing
  `ddl-auto=update` - flagged during the gachagrid.com deploy (2026-08-24).
  `update` auto-alters the live Neon schema on every boot with no review
  step, no rollback, and renames/drops don't work as intended (a rename
  just adds a new column and orphans the old one). Deliberately not done
  now - real added complexity (baselining Flyway against an already-live
  schema, switching `ddl-auto` to `validate`) for a project that's still
  pre-launch and where schema changes are infrequent. Revisit once either
  real user data exists that a bad auto-migration could damage, or schema
  changes get frequent enough that "what changed and when" stops being
  reconstructable from memory. Note this is scoped to *structural* changes
  (new tables/columns) only - adding a new attribute/category (like `tags`/
  `release_year` this session) never touches the schema at all, since
  `GridItem.attributes` is a flexible JSONB `Map<String, Object>` and
  `CategoryDefinition`s are derived from whatever keys/values already
  exist in that data - see `GameModule`/`AttributeEqualsCategory`.

## Notes
- Total estimate: ~8-10 weeks part-time, revised upward from the original
  estimate given Phase 3 grew into a full Unlimited-mode build rather than
  a lighter "polish pass."
- Phases 0-7.5 complete — GachaGrid is live at gachagrid.com. Phase 6's
  formerly-only unchecked item (deploy backend + frontend + managed
  Postgres) shipped 2026-08-24, and everything that followed from actually
  going live (deploy-time infra fixes, a server-side guess-limit security
  hole closed, admin curation tooling, self-hosted icons, Archive/SEO/
  ops/share polish) is now tracked as its own Phase 7.5 rather than left
  as a pile of unreconciled commits. Only Phases 8-9 (real-time
  head-to-head, then scale/leaderboards/a third game) remain unstarted.
  This file and `docs/ARCHITECTURE.md` had drifted out of sync with
  several sessions' worth of shipped work twice now (first reconciled
  2026-08-22, again 2026-08-25 after the deploy) — worth re-checking both
  against `git log` periodically rather than trusting them as current by
  default. See Backlog for three smaller
  Phase-5-adjacent items (additional category dimensions, shareable
  result summary, cross-mode navigation persistence) deliberately moved
  out rather than left half-checked, since none of them block Phase 6.
  Phase 2
  additionally validated the architecture empirically (not just by design)
  and fixed a real latent bug in the process; Phase 3 did the same for the frontend
  (the `PuzzleGrid` centering bug and the `ddl-auto=update` schema gotchas
  were both only discovered by actually running the app end-to-end, not by
  code review). Phase 4 leaned on the same discipline for `GridGenerator`:
  every tuning change was measured against a real baseline before/after,
  including two variants that looked reasonable in theory but were
  rejected once the numbers came back — and the narrow-filter generation
  failures and the soft-lock puzzle were both found by actually playing
  Unlimited mode, not by reasoning about the algorithm in the abstract.
  Phase 5 found another real bug the same way: the clipped-name rendering
  issue only surfaced from actually looking at a long name in the browser.
  Phase 6's first slice (session tracking, `puzzle_attempts`, `/stats`, live
  rarity badges) was verified the same way rather than by reasoning about
  the aggregation logic in isolation: three separate real browser sessions
  played the same live puzzle end to end (one full solve, one partial
  give-up with a deliberately different pick, one mid-game session reading
  the other two's results), and the live badge/percentile/uniqueness math
  was cross-checked by hand against what the database actually recorded.
  The second slice (Puzzle Stats panel, Community Answers/Scores/Rank
  modals) got the same treatment with a larger 5-session dataset, and
  incidentally produced a clean real-world demonstration of the "always
  live, never cached" design principle: the exact same finished board's own
  uniqueness score visibly changed (842 → 855) between two screenshots
  taken minutes apart, purely because a 5th session joined and shifted the
  community distribution in between — the intended behavior, caught in the
  act rather than just claimed in the design doc. The mobile-responsiveness
  pass at the end of Phase 6 followed the same discipline once more: the
  fixed-`rem` grid overflow was only found by actually emulating a real
  iPhone 15 Pro Max viewport (430px), not by reasoning about the CSS in the
  abstract — and the fix was verified the same way, across the full Daily
  flow (empty grid, guess input, finished game, every modal) plus a
  desktop-width regression check to confirm nothing shifted above the
  breakpoint.
