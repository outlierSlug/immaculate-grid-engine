"""
Generic Entity schema shared by every game module's ingestion pipeline.
"""
from typing import Optional

from pydantic import BaseModel, Field


class GenshinAttributes(BaseModel):
    element: str          # from "vision" in raw data
    weapon: str
    rarity: int = Field(ge=4, le=5)
    region: str            # from "nation" in raw data
    model: str
    release_date: str      # from "release" in raw data, e.g. "2020-12-23"
    release_version: str
    # Derived from release_version (see normalize_genshin.py's release_era())
    # - buckets the ~51 thin exact versions down to ~7 healthy ones for a
    # coarser puzzle category, not a second independently-scraped field.
    release_era: str
    # Ascension-related attributes - see ingestion/genshin/README.md's
    # "Ascension-materials enrichment pipeline" section for where these
    # come from (Dimbreath's datamined game files, cross-checked against a
    # wiki table - 119/119 characters matched exactly). The elemental
    # gemstone is deliberately not a category here - it's 1:1 with
    # `element`, which already exists. common_material is the 3rd
    # (highest-rarity) tier's name, not a synthesized family label - see
    # build_ascension_materials.py's own comment on why.
    local_specialty: str
    common_material: str
    # Traveler has no boss material at all (see README.md) - every other
    # character has one.
    boss_material: Optional[str] = None
    ascension_stat: str


class Entity(BaseModel):
    id: str
    game_id: str
    display_name: str
    image_url: str
    attributes: GenshinAttributes


def validate_entities(raw_entities: list[dict]) -> list[Entity]:
    validated = [Entity(**e) for e in raw_entities]

    ids = [e.id for e in validated]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate entity IDs found in dataset")

    from collections import Counter
    # Not a hard error - a thin category is still a valid puzzle dimension
    # value, just one the generator's minAnswersPerCell/soft-lock-guard
    # checks may reject more often. local_specialty and boss_material are
    # known to run heavily long-tailed (most values are 1-2 characters -
    # see ingestion/genshin/README.md) - the warning is purely informational
    # here, not something to "fix" by merging values together.
    for attribute in ("element", "local_specialty", "common_material", "boss_material", "ascension_stat"):
        counts = Counter(getattr(e.attributes, attribute) for e in validated if getattr(e.attributes, attribute))
        thin = {value: n for value, n in counts.items() if n < 3}
        if thin:
            print(f"WARNING: thin '{attribute}' categories (fewer than 3 entities): {thin}")

    return validated