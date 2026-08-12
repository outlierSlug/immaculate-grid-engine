"""
Phase 0 step 2: transform raw/genshin_characters_raw.json into the generic
Entity schema and write the validated result to output/genshin_entities.json.
"""
import json
from pathlib import Path

from schema import validate_entities

RAW_PATH = Path(__file__).parent / "raw" / "genshin_characters_raw.json"
OUTPUT_PATH = Path(__file__).parent / "output" / "genshin_entities.json"
BASE_URL = "https://genshin.jmp.blue"


def map_character(raw: dict) -> dict:
    char_id = raw["id"].lower()
    element = raw["vision"]
    display_name = raw["name"]
    if char_id.startswith("traveler"):
        display_name = f"Traveler ({element})"
    return {
        "id": char_id,
        "game_id": "genshin",
        "display_name": display_name,
        "image_url": f"{BASE_URL}/characters/{char_id}/card",
        "attributes": {
            "element": element,
            "weapon": raw["weapon"],
            "rarity": raw["rarity"],
            "region": raw["nation"],
            "release_date": raw["release"],
        },
    }


def main():
    raw_records = json.loads(RAW_PATH.read_text())
    mapped = [map_character(r) for r in raw_records]

    validated = validate_entities(mapped)

    OUTPUT_PATH.parent.mkdir(exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps([e.model_dump() for e in validated], indent=2)
    )
    print(f"Wrote {len(validated)} validated entities to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()