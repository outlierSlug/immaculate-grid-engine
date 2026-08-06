"""
Generic Entity schema shared by every game module's ingestion pipeline.
"""
from pydantic import BaseModel, Field


class GenshinAttributes(BaseModel):
    element: str          # from "vision" in raw data
    weapon: str
    rarity: int = Field(ge=4, le=5)
    region: str            # from "nation" in raw data
    release_date: str      # from "release" in raw data, e.g. "2020-12-23"


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
    element_counts = Counter(e.attributes.element for e in validated)
    thin = {el: n for el, n in element_counts.items() if n < 3}
    if thin:
        print(f"WARNING: thin categories (fewer than 3 entities): {thin}")

    return validated