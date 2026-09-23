"""
Transform raw/brawlstars_brawlers_raw.json into the generic
Entity schema and write the validated result to output/brawlstars_entities.json.
"""
import json
import re
from pathlib import Path

from backfill_brawler_classes import KNOWN_CLASSES
from backfill_brawler_release_years import KNOWN_RELEASE_YEARS
from backfill_brawler_tags import KNOWN_TAGS
from backfill_brawler_traits import KNOWN_TRAITS
from schema import validate_entities

RAW_PATH = Path(__file__).parent / "raw" / "brawlstars_brawlers_raw.json"
OUTPUT_PATH = Path(__file__).parent / "output" / "brawlstars_entities.json"

# BrawlAPI's own raw["released"] flips true as soon as a brawler is
# *announced*, not when they're actually playable - confirmed 2026-09-07 for
# Cosmo/Vince (API says released, but neither is in the game yet; Brawlify's
# own icon-asset mirror hasn't been touched in 2 months, consistent with
# that). raw["released"] alone isn't a reliable signal here the way it is
# for Clash Royale, so this is a manual override until each name is
# confirmed actually live - remove the entry (and add real
# class/traits/release-year backfill data) once it's genuinely in the game,
# not just announced.
ANNOUNCED_NOT_YET_PLAYABLE = {"Cosmo", "Vince"}


# Filename/URL-safe form of a brawler's name - deliberately separate from
# the `id` field below, which keeps raw["name"].lower() as-is (spaces and
# all, e.g. "brawlstars:el primo") since that's the existing, already-live
# id scheme and changing it would orphan existing puzzle_attempts/puzzles
# rows. Icon filenames need to be safe (no spaces/punctuation), so
# download_icons.py imports this same function to keep the two in sync.
def slugify(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s)
    return s


def get_image_url(name: str) -> str:
    # Self-hosted (see ingestion/brawlstars/download_icons.py) - root-relative
    # so it resolves against whatever origin serves the frontend, same as any
    # other frontend/public asset. Was Brawlify's own raw["imageUrl"] before.
    return f"/brawlstars/icons/{slugify(name)}.png"


def map_brawler(raw: dict) -> dict | None:
    if not raw.get("released", False):
        return None  # skip unreleased brawlers entirely - not real puzzle answers yet
    if raw["name"] in ANNOUNCED_NOT_YET_PLAYABLE:
        return None

    return {
        "id": f"brawlstars:{raw['name'].lower()}",
        "game_id": "brawlstars",
        "display_name": raw["name"],
        "image_url": get_image_url(raw["name"]),
        "attributes": {
            "rarity": raw["rarity"]["name"],
            # No .get() default, same reasoning as release_year below -
            # BrawlAPI's own raw["class"]["name"] can no longer be trusted
            # for ANY brawler (see backfill_brawler_classes.py's own comment -
            # it was repurposed to a per-brawler tagline, not the shared
            # Tank/Assassin/etc taxonomy, for long-established brawlers too,
            # not just newly-added ones), so KNOWN_CLASSES is the sole
            # source of truth now, not just an "Unknown"-only fallback.
            "brawler_class": KNOWN_CLASSES[raw["name"]],
            "traits": KNOWN_TRAITS.get(raw["name"], []),
            "tags": KNOWN_TAGS.get(raw["name"], []),
            # No .get() default - unlike traits/tags (legitimately empty for
            # most brawlers), every released brawler has exactly one release
            # year, so a missing entry here means the backfill data is
            # incomplete and should fail loudly rather than silently
            # producing a null release_year.
            "release_year": KNOWN_RELEASE_YEARS[raw["name"]],
        },
    }


def main():
    raw_records = json.loads(RAW_PATH.read_text())
    mapped = [map_brawler(r) for r in raw_records]
    mapped = [m for m in mapped if m is not None]  # drop unreleased brawlers

    validated = validate_entities(mapped)

    OUTPUT_PATH.parent.mkdir(exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps([e.model_dump() for e in validated], indent=2)
    )
    print(f"Wrote {len(validated)} validated entities to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()