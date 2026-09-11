"""
Generic Entity schema for the Honkai: Star Rail ingestion pipeline.
"""
from collections import Counter

from pydantic import BaseModel, Field


class StarRailAttributes(BaseModel):
    rarity: int  # 4 or 5
    path: str  # Destruction / The Hunt / Erudition / Harmony / Nihility / Preservation / Abundance / Remembrance / Elation
    element: str  # Physical / Fire / Ice / Lightning / Wind / Quantum / Imaginary
    # Multi-valued (a character may hold zero, one, or several planet/
    # faction/group affiliations) - see raw/affiliations.txt for the
    # hand-curated source list and raw/affiliation_definitive_plan.txt for
    # the full design (StarRailGameModule's min-count floor included).
    affiliation: list[str] = Field(default_factory=list)


class Entity(BaseModel):
    id: str
    game_id: str
    display_name: str
    image_url: str
    attributes: StarRailAttributes


def validate_entities(raw_entities: list[dict]) -> list[Entity]:
    validated = [Entity(**e) for e in raw_entities]

    ids = [e.id for e in validated]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate entity IDs found in dataset")

    def warn_thin(label: str, counts: Counter):
        thin = {k: n for k, n in counts.items() if n < 3}
        if thin:
            print(f"WARNING: thin {label} categories (fewer than 3 entities): {thin}")

    warn_thin("rarity", Counter(e.attributes.rarity for e in validated))
    warn_thin("path", Counter(e.attributes.path for e in validated))
    warn_thin("element", Counter(e.attributes.element for e in validated))
    warn_thin("affiliation", Counter(a for e in validated for a in e.attributes.affiliation))

    return validated
