"""
Transform raw/brawlstars_brawlers_raw.json into the generic
Entity schema and write the validated result to output/brawlstars_entities.json.
"""
import json
from pathlib import Path

from backfill_brawler_classes import KNOWN_CLASSES
from backfill_brawler_traits import KNOWN_TRAITS
from schema import validate_entities

RAW_PATH = Path(__file__).parent / "raw" / "brawlstars_brawlers_raw.json"
OUTPUT_PATH = Path(__file__).parent / "output" / "brawlstars_entities.json"


def map_brawler(raw: dict) -> dict | None:
    if not raw.get("released", False):
        return None  # skip unreleased brawlers entirely - not real puzzle answers yet

    brawler_class = raw["class"]["name"]
    if brawler_class == "Unknown":
        brawler_class = KNOWN_CLASSES.get(raw["name"])  # hand-curated, see backfill_brawler_classes.py

    return {
        "id": f"brawlstars:{raw['name'].lower()}",
        "game_id": "brawlstars",
        "display_name": raw["name"],
        "image_url": raw["imageUrl"],
        "attributes": {
            "rarity": raw["rarity"]["name"],
            "brawler_class": brawler_class,
            "traits": KNOWN_TRAITS.get(raw["name"], []),
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