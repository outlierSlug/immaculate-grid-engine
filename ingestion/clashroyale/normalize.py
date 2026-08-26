"""
Transform raw/clashroyale_cards_raw.json into the generic Entity schema and
write the validated result to output/clashroyale_entities.json.
"""
import json
import re
from pathlib import Path

from schema import validate_entities

RAW_PATH = Path(__file__).parent / "raw" / "clashroyale_cards_raw.json"
OUTPUT_PATH = Path(__file__).parent / "output" / "clashroyale_entities.json"

# Supercell's own id numbering is a strong but NOT perfectly reliable
# convention (not present as an explicit field anywhere in the API
# response, so this is the only way to get card type without an external
# source) - ids get assigned once and never renumbered even when a card's
# actual type changes (a rework) or was simply miscategorized to begin
# with. Known exceptions, hand-curated below and checked before falling
# back to this table - same pattern as Brawl Stars' KNOWN_CLASSES backfill
# for its own "Unknown"-class brawlers.
CARD_TYPE_BY_ID_PREFIX = {
    "26": "Troop",
    "27": "Building",
    "28": "Spell",
}

CARD_TYPE_OVERRIDES = {
    # id 28000025 (Spell range), but is actually a Legendary Troop.
    "Spirit Empress": "Troop",
    # id 27000xxx (Building range) - was a stationary building, reworked
    # into a Troop since; the old id was never renumbered.
    "Furnace": "Troop",
    # id 28000016 (Spell range) - was the spell "Heal", reworked into the
    # troop "Heal Spirit"; the old id was never renumbered.
    "Heal Spirit": "Troop",
}


# Same slugify used by every other game's ingestion (genshin/brawlstars) -
# handles names like "P.E.K.K.A" -> "pekka", "X-Bow" -> "x-bow".
def slugify(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s)
    return s


def get_image_url(slug: str, form: str) -> str:
    # Self-hosted, same "build-time source only" treatment as Genshin/Brawl
    # Stars (see download_icons.py, written against these exact filenames).
    suffix = {"Base": "", "Evolution": "-evo", "Hero": "-hero"}[form]
    return f"/clashroyale/icons/{slug}{suffix}.png"


def card_type(raw: dict) -> str:
    if raw["name"] in CARD_TYPE_OVERRIDES:
        return CARD_TYPE_OVERRIDES[raw["name"]]
    prefix = str(raw["id"])[:2]
    return CARD_TYPE_BY_ID_PREFIX[prefix]


def map_card(raw: dict) -> list[dict]:
    name = raw["name"]
    slug = slugify(name)
    icon_urls = raw["iconUrls"]

    base_attributes = {
        "rarity": raw["rarity"].capitalize(),
        "card_type": card_type(raw),
        "elixir_cost": raw.get("elixirCost"),  # None for Mirror - dynamic cost, see schema.py
    }

    entities = [{
        "id": f"clashroyale:{slug}",
        "game_id": "clashroyale",
        "display_name": name,
        "image_url": get_image_url(slug, "Base"),
        "attributes": {**base_attributes, "form": "Base"},
    }]

    # Spirit Empress is a single deck card but plays as two functionally
    # distinct states - deployed as a flying 6-elixir troop, then drops
    # permanently into a tankier 3-elixir ground-only troop. Modeled as a
    # second independently-guessable entity (same "one raw record -> many
    # entities" idea as Evolution/Hero below) since the two states differ
    # in a real puzzle attribute (elixir cost) - hand-curated, not
    # derivable from the API the way Evolution/Hero are (no separate icon
    # URL/flag exists for it, so the icon itself is a manually-provided
    # asset too, not something download_icons.py fetches).
    if name == "Spirit Empress":
        entities.append({
            "id": f"clashroyale:{slug}-ground",
            "game_id": "clashroyale",
            "display_name": f"{name} (Ground)",
            "image_url": f"/clashroyale/icons/{slug}-ground.png",
            "attributes": {**base_attributes, "elixir_cost": 3, "form": "Base"},
        })

    # Evolution/Hero forms play differently enough (an evolved ability, or
    # tower-defense placement) to be their own guessable answer rather than
    # just a tag on the base card - same "one raw record -> multiple
    # independently-guessable entities" pattern as Genshin's Traveler.
    # Detected from icon-URL presence, not maxEvolutionLevel/a name check -
    # verified against the full raw fetch that these two flags are exactly
    # what distinguishes the 41 Evolution-having and 16 Hero-having cards.
    if "evolutionMedium" in icon_urls:
        entities.append({
            "id": f"clashroyale:{slug}-evo",
            "game_id": "clashroyale",
            "display_name": f"Evo {name}",
            "image_url": get_image_url(slug, "Evolution"),
            "attributes": {**base_attributes, "form": "Evolution"},
        })

    if "heroMedium" in icon_urls:
        entities.append({
            "id": f"clashroyale:{slug}-hero",
            "game_id": "clashroyale",
            "display_name": f"Hero {name}",
            "image_url": get_image_url(slug, "Hero"),
            "attributes": {**base_attributes, "form": "Hero"},
        })

    return entities


def main():
    raw_records = json.loads(RAW_PATH.read_text(encoding="utf-8"))
    mapped = [entity for raw in raw_records for entity in map_card(raw)]

    validated = validate_entities(mapped)

    OUTPUT_PATH.parent.mkdir(exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps([e.model_dump() for e in validated], indent=2)
    )
    print(f"Wrote {len(validated)} validated entities to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
