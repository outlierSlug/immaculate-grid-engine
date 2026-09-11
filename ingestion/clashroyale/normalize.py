"""
Transform raw/clashroyale_cards_raw.json into the generic Entity schema and
write the validated result to output/clashroyale_entities.json.
"""
import json
import re
from pathlib import Path

from schema import validate_entities

RAW_PATH = Path(__file__).parent / "raw" / "clashroyale_cards_raw.json"
TARGETING_PATH = Path(__file__).parent / "raw" / "targeting.txt"
OUTPUT_PATH = Path(__file__).parent / "output" / "clashroyale_entities.json"

# The trailing group in targeting.txt (Clone/Mirror/Elixir Collector - cards
# with no attack of their own) isn't a real targeting value - those cards
# get an empty list, same as any card the file never mentions.
NO_TARGETING_GROUP = "No targeting (excluded entirely - not a selectable category)"


def parse_targeting() -> dict[str, list[str]]:
    """Parse raw/targeting.txt (blank-line-separated blocks: a group header,
    then one card display_name per line) into {display_name -> [targeting
    labels]}. A card can appear under two group headers (a handful of real
    edge cases hold two targeting values) - see
    raw/targeting_definitive_plan.txt for the full design."""
    card_to_groups: dict[str, list[str]] = {}
    current_group: str | None = None
    for raw_line in TARGETING_PATH.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line:
            current_group = None
            continue
        if current_group is None:
            current_group = line
            continue
        if current_group == NO_TARGETING_GROUP:
            continue
        card_to_groups.setdefault(line, []).append(current_group)
    return card_to_groups

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


def map_card(raw: dict, targeting_map: dict[str, list[str]]) -> list[dict]:
    name = raw["name"]
    slug = slugify(name)
    icon_urls = raw["iconUrls"]

    base_attributes = {
        "rarity": raw["rarity"].capitalize(),
        "card_type": card_type(raw),
        "elixir_cost": raw.get("elixirCost"),  # None for Mirror - dynamic cost, see schema.py
    }

    # Looked up per-entity by its own display_name (not folded into
    # base_attributes above) since targeting.txt keys Evolution/Hero/the
    # Spirit Empress ground form independently and a form's targeting isn't
    # guaranteed to match its base card's, even though it happens to today.
    def targeting_for(display_name: str) -> list[str]:
        return targeting_map.get(display_name, [])

    entities = [{
        "id": f"clashroyale:{slug}",
        "game_id": "clashroyale",
        "display_name": name,
        "image_url": get_image_url(slug, "Base"),
        "attributes": {**base_attributes, "form": "Base", "targeting": targeting_for(name)},
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
        ground_name = f"{name} (Ground)"
        entities.append({
            "id": f"clashroyale:{slug}-ground",
            "game_id": "clashroyale",
            "display_name": ground_name,
            "image_url": f"/clashroyale/icons/{slug}-ground.png",
            "attributes": {**base_attributes, "elixir_cost": 3, "form": "Base", "targeting": targeting_for(ground_name)},
        })

    # Evolution/Hero forms play differently enough (an evolved ability, or
    # tower-defense placement) to be their own guessable answer rather than
    # just a tag on the base card - same "one raw record -> multiple
    # independently-guessable entities" pattern as Genshin's Traveler.
    # Detected from icon-URL presence, not maxEvolutionLevel/a name check -
    # verified against the full raw fetch that these two flags are exactly
    # what distinguishes the 41 Evolution-having and 16 Hero-having cards.
    if "evolutionMedium" in icon_urls:
        evo_name = f"Evo {name}"
        entities.append({
            "id": f"clashroyale:{slug}-evo",
            "game_id": "clashroyale",
            "display_name": evo_name,
            "image_url": get_image_url(slug, "Evolution"),
            "attributes": {**base_attributes, "form": "Evolution", "targeting": targeting_for(evo_name)},
        })

    if "heroMedium" in icon_urls:
        hero_name = f"Hero {name}"
        entities.append({
            "id": f"clashroyale:{slug}-hero",
            "game_id": "clashroyale",
            "display_name": hero_name,
            "image_url": get_image_url(slug, "Hero"),
            "attributes": {**base_attributes, "form": "Hero", "targeting": targeting_for(hero_name)},
        })

    return entities


def main():
    raw_records = json.loads(RAW_PATH.read_text(encoding="utf-8"))
    targeting_map = parse_targeting()
    mapped = [entity for raw in raw_records for entity in map_card(raw, targeting_map)]

    # Catches a typo/rename in targeting.txt (a card name that no longer
    # matches any entity's display_name) as a hard failure - same bar
    # Star Rail's affiliation parser holds raw/affiliations.txt to.
    known_names = {e["display_name"] for e in mapped}
    unknown_cards = sorted(set(targeting_map) - known_names)
    if unknown_cards:
        raise ValueError(f"targeting.txt references unknown cards: {unknown_cards}")

    validated = validate_entities(mapped)

    OUTPUT_PATH.parent.mkdir(exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps([e.model_dump() for e in validated], indent=2)
    )
    print(f"Wrote {len(validated)} validated entities to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
