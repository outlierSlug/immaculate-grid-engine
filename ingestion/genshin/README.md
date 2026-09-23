# Genshin Impact ingestion

## Adding a new character (runbook)

Both pipelines below are involved, plus several steps nothing automates.
This is the order that worked for 7.1's Vesna and Vodyanitsa
(2026-09-22); the two pipeline sections after it explain *why* each piece
exists.

**Wait for the version to actually ship.** Community mirrors lag a
release: when 7.1 went live, Dimbreath had the data within a day but Enka
had not published either character's icon. Announced-but-unreleased data
is also incomplete or wrong, so nothing here should be run off a leak.

1. **Hand-enter the character** in `raw/genshin_characters.json`: `name`,
   `rarity`, `element`, `weapon`, `region`, `model`, `release_date`,
   `release_version`. **The file is strictly alphabetical by name** -
   insert in place, don't append, or the generated entities diff becomes
   unreadable. Only `model` (body type) is hard to find on the wiki; the
   datamine carries it as `bodyType` (`BODY_GIRL` = Medium Female,
   `BODY_BOY` = Medium Male, and so on), which is also a good check on
   everything else you typed.
2. **Add the icon code** to `ENKA_ICON_MAP` in `normalize_genshin.py`.
   It's usually `UI_AvatarIcon_<Name>`, but internal names differ often
   enough to check (Xianyun is `Liuyun`, Sandrone is `MarionetteNew`).
   Find it in `AvatarExcelConfigData.json` rather than guessing.
3. **Add any passive-talent membership** to `PASSIVE_TALENT_MAP` in the
   same file, or nothing at all if none apply - most characters have
   none. `raw/passive_talent_definitive_plan.txt` has all 11 categories
   and their definitions. Verify against the character's actual passives
   rather than a description of their kit: join their `skillDepotId` to
   `AvatarSkillDepotExcelConfigData.json`, then the passive group ids to
   `ProudSkillExcelConfigData.json`, and read the text. That is how
   Vesna's `Stellar Jubilee` was confirmed - her third passive is named
   "Stellar Jubilee: Splendid Prelude", which is the category exactly.
   Watch the direction of a passive too: both 7.1 characters have
   traversal passives that *increase* Stamina consumption, which is the
   opposite of the `Stamina Reduction` category.
4. **`fetch_dimbreath.py` → `build_ascension_materials.py`** derives the
   4 ascension attributes. It joins on the icon code from step 2, so it
   has to come after it. Compare the result against the wiki (or against
   values supplied by a player who has the character) - for 7.1 all eight
   hand-supplied values matched the datamine exactly.
5. **`normalize_genshin.py`** → check the entity count went up by the
   right number and that **no existing entity changed**, then copy
   `output/genshin_entities.json` to
   `backend/src/main/resources/genshin_entities.json`.
6. **`download_icons.py`** for the character portrait. If Enka 404s
   (likely, right after a release), take it from Project Amber
   (`https://gi.yatta.moe/assets/UI/<code>.png`) and convert it to RGBA -
   every other character icon is RGBA, Amber serves palette PNGs. Copy
   into `frontend/public/genshin/icons/`.
7. **`download_ascension_icons.py`** - easy to forget, and nothing else
   flags it. A new character usually brings new *material* values too
   (Vesna introduced Golden Fern and Vagabond's Cracked Armor), and each
   needs its own icon. The script prints the per-dimension counts; copy
   any new files into
   `frontend/src/assets/genshin/ascension/<dimension>/`. These stay
   palette PNGs, matching the other 127.
8. **Do NOT re-run `build_material_sources.py`** - see its own docstring.
   Against the 7.1 TextMap its regex stops matching for 23 of 66 values,
   degrading them to vaguer fallbacks and dropping 5 entirely. Add a new
   boss/common material's source by hand to both
   `output/genshin_material_sources.json` and
   `frontend/src/assets/genshin/ascension/material_sources.json` (they
   are kept byte-identical), and add the same value to the script's
   `MANUAL_OVERRIDES` so the knowledge isn't only in the artifact. A
   material with no source entry is a silent no-op - `CategoryChip.tsx`
   falls back to a generic "(a boss material)" tooltip.
9. **Update the player-facing text**: the "released up through Version
   X" note in `frontend/src/config/gameHelpNotes.tsx`, and a
   `frontend/src/data/changelog.ts` entry (new characters change what
   counts as a valid answer, which is exactly what that log is for).
10. **Load the data**: run the backend once with the `load-data` profile
    locally, confirm `Loaded N grid items for genshin` and that the
    character is served by `/api/items`, then run the same against prod.
    It upserts by id, so it is safe to re-run.

**Never truncate `puzzles` for a character addition.** Older notes say to,
but that was for *attribute changes*, where stale `cellSolutions`
snapshots would go wrong. Those snapshots are now the permanent answer key
behind Archive, historical stats and collections. A newly added character
simply won't be a valid answer on puzzles generated before the reload,
which is correct.

**What needs no work at all:** `release_era()` already parses any `X.Y`
version, the collection page's roster total comes from `/api/items`, and
`GenshinGameModule`'s min-count floor (3) keeps a brand-new
`release_version` or material out of puzzle generation until enough
characters share it - so two new characters can't produce a
single-answer cell.

Two pipelines live in this folder, run in order: the character roster
pipeline is the source of truth for every non-ascension attribute; the
ascension-materials pipeline enriches it with 4 more categories. They
share `raw/genshin_characters.json` as their character list and
`ENKA_ICON_MAP`/`TRAVELER_GENDERS` (defined in `normalize_genshin.py`) as
their join key into the game's own icon-naming convention.

## 1. Character roster pipeline

`raw/genshin_characters.json` → `normalize_genshin.py` → `output/genshin_entities.json`,
plus `download_icons.py` → `output/icons/`.

- **`raw/genshin_characters.json`** is the source of truth for every
  attribute a character has today (element/weapon/rarity/region/model/
  release date/release version) - hand-maintained against the wiki, not
  scraped. This is what actually feeds the backend's `load-data` step.
- **`schema.py`** validates the normalized output shape, including the 4
  ascension attributes from pipeline 2 below.
- **`normalize_genshin.py`** maps each raw record to one or more `GridItem`
  entities (most characters map 1:1; Traveler expands to 14 - 2 genders ×
  7 elements currently modeled; Wonderland Manekin is excluded as
  non-playable). Also joins in the ascension data from pipeline 2 below
  (reads `output/genshin_ascension_materials.json` directly, not a copy
  under `raw/`) - fails loudly if a character has no matching ascension
  record, rather than writing an empty placeholder.
- **`download_icons.py`** self-hosts each character's icon from Enka's CDN
  (`ENKA_ICON_MAP`) into `output/icons/`, so the frontend never depends on
  a third party staying up.

Run order after editing `raw/genshin_characters.json` (e.g. a new
character, or a corrected attribute): `normalize_genshin.py` →
`download_icons.py`. A brand-new character also needs pipeline 2 run
first (`normalize_genshin.py` will fail loudly telling you so if you
forget).

## 2. Ascension-materials enrichment pipeline

Adds 4 more categories - local specialty, common/enemy-drop material,
boss material, and ascension stat - merged into `GenshinAttributes`
(`schema.py`) and joined in by pipeline 1's `normalize_genshin.py` above.

Two independent sources, cross-checked against each other:

- **Dimbreath's datamined game files** (`fetch_dimbreath.py` downloads
  them into `raw/dimbreath/`, gitignored - ~30MB, regenerable) →
  `build_ascension_materials.py` → `output/genshin_ascension_materials.json`
  (this is the file pipeline 1 actually reads - keep it up to date whenever
  the roster changes).
- **Hand-copied wiki tables** (`raw/wiki_ascension_materials_table.txt`,
  `raw/wiki_ascension_stats_table.txt` - paste fresh copies from the wiki
  if these ever need updating) → `parse_wiki_ascension.py` →
  `output/wiki_ascension_materials.json` + `output/wiki_ascension_stats.json`.
  `parse_wiki_ascension.py` also diffs its own output against
  `build_ascension_materials.py`'s (`output/ascension_materials_diff.json`)
  - as of the last run, 119/119 characters (Traveler included) matched
  exactly across both sources, zero discrepancies.
- **`download_ascension_icons.py`** downloads one icon per distinct
  local-specialty/common-material/boss-material *value* (not per
  character - 125 total, sorted into `output/icons/ascension/
  {local_specialty,common_material,boss_material}/`) from Project Yatta's
  asset mirror - not Enka, which lags noticeably behind on the newest
  characters' item icons (confirmed: Enka 404s on ~25% of these). Reads
  `output/genshin_ascension_materials.json` for which values are actually
  needed, so run `build_ascension_materials.py` first. Ascension stat has
  no icon of its own - it renders as a plain-text pill, same treatment as
  Rarity's "4-Star"/"5-Star".

- **`build_material_sources.py`** answers a different question than the
  rest of this pipeline - not "which materials does a character need" but
  "which enemy/boss drops each common/boss material," for
  `CategoryChip.tsx`'s tooltip (`This character requires X (Y) to
  ascend.`). Mines Dimbreath's material *flavor text* (a separate field
  from the ascension-requirement data pipeline 1 uses - see
  `raw/material_flavor_dump.txt`, a saved reference dump of every value's
  flavor text, and `raw/boss_material_names.txt`, the plain list of boss
  material values it was built against) via a regex-first pass (every
  auto-extracted name is a verbatim quote from the game's own text, not a
  guess), falling back to `MANUAL_OVERRIDES` in the script for text that
  doesn't parse cleanly - all 66 entries (19 common + 47 boss) were
  human-reviewed and corrected against actual game knowledge before being
  trusted; several auto-extracted names were replaced with more specific
  official boss names during that review (e.g. "the Wolflord" →
  "Golden Wolflord", "ruin machine" → "Aeonblight Drake"). Writes
  `output/genshin_material_sources.json` - copy into
  `frontend/src/assets/genshin/ascension/material_sources.json` (same
  plain-copy step as the icons). Deliberately covers every value in
  `genshin_entities.json`, not just the ones that clear
  `GenshinGameModule`'s min-count floor into a real category - keeps the
  tooltip consistent regardless of which materials a given generation's
  floor lets through. An unresolved value (no confident source in the
  flavor text) is simply left out of the output, not guessed -
  `CategoryChip.tsx` falls back to its older generic "(a boss material)"
  tooltip for those, so a gap here is a silent no-op, never a wrong name
  shown to a player. **Re-running this one is no longer safe** - against
  the 7.1 TextMap the regex stops matching for 23 of the 66 values and 5
  drop out entirely, losing exactly the specific boss names that review
  pass added ("Golden Wolflord" reverts to "the Wolflord"). Add new
  values by hand instead (runbook step 8), and reconcile the regex and
  `MANUAL_OVERRIDES` against current flavor text before ever trusting a
  full re-run.

Run order: `fetch_dimbreath.py` → `build_ascension_materials.py` →
`parse_wiki_ascension.py` → `download_ascension_icons.py` → copy
`output/icons/ascension/` into `frontend/src/assets/genshin/ascension/`
(not automated - a plain file copy) → back to pipeline 1's
`normalize_genshin.py` to actually wire the new/changed data into
`genshin_entities.json`. `build_material_sources.py` is deliberately
*not* in that run order any more (see its entry above); its output and
the frontend copy of it are now maintained by hand.

**If an icon is missing** (a new character's material 404s on Yatta too,
or `download_ascension_icons.py` just wasn't re-run after a roster
change): `CategoryChip.tsx` falls back to a plain text pill with no icon
and no tooltip, silently - the same fallback every other unmapped
category label in that file already gets. It won't look broken, just
less polished than the icon-backed treatment. `download_ascension_icons.py`
itself reports exactly which names it couldn't resolve or download on
every run - check that output when adding a new character, since nothing
else will flag a gap for you.

### Known decisions baked into this pipeline

- The elemental **gemstone** is deliberately skipped - it's 1:1 with
  `element`, which already exists as its own category.
- The **common/enemy-drop material** category value is the 3rd
  (highest-rarity) tier's name, not a synthesized family label - its icon
  is the most detailed/distinct of the 3 tiers, so it's what a player will
  actually recognize.
- **Traveler** ascends identically across every element (same materials,
  same ascension stat - confirmed against real game behavior, and matches
  what the data itself shows: Traveler ascends on a unique gemstone,
  Brilliant Diamond, with no elemental variants). One record
  (`TRAVELER_ASCENSION` in `normalize_genshin.py`), applied to all 14
  entities pipeline 1 generates - not resolved per-element.
- **`GenshinGameModule`** (backend) applies a minimum member-count floor
  (3) to `local_specialty`/`boss_material` specifically before exposing
  them as puzzle categories - both are heavily long-tailed at the raw
  `GridItem` level (most values shared by 1-2 characters; the single
  exception, "Windwheel Aster" at 16, is almost entirely Traveler's own
  14 variants sharing one record, not real diversity). It also applies a
  weight (`ASCENSION_WEIGHT = 0.3`, vs `BOOSTED_WEIGHT = 2.0` for
  rarity/region) via the generic `CategoryDefinition.getWeight()`
  mechanism, so all 4 ascension dimensions appear less often than the
  "main" categories in real puzzles - tuned against a live measurement of
  300 real generations, not picked once and left alone. See
  `GenshinGameModule`'s own comments for the exact numbers.
