"""
Generic Entity schema for the Clash Royale ingestion pipeline.
"""
from collections import Counter

from pydantic import BaseModel, Field


class ClashRoyaleAttributes(BaseModel):
    rarity: str
    card_type: str  # Troop / Building / Spell - derived from the card id's prefix, see normalize.py
    # None only for Mirror, whose real elixir cost is dynamic (last-played
    # cost + 1, capped) - the API omits the field entirely rather than
    # report a misleading constant, so this stays nullable rather than
    # inventing a fake number.
    elixir_cost: int | None
    form: str  # Base / Evolution / Hero - see normalize.py's map_card for how the split works
    # Multi-valued (a card is normally exactly one of Targets Buildings /
    # Targets Air & Ground / Targets Ground Only, but a handful of real
    # edge cases hold two - see raw/targeting.txt and raw/
    # targeting_definitive_plan.txt). Not present in the raw API response -
    # hand-curated, same as Star Rail's affiliation.
    targeting: list[str] = Field(default_factory=list)


class Entity(BaseModel):
    id: str
    game_id: str
    display_name: str
    image_url: str
    attributes: ClashRoyaleAttributes


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
    warn_thin("card_type", Counter(e.attributes.card_type for e in validated))
    warn_thin("elixir_cost", Counter(e.attributes.elixir_cost for e in validated if e.attributes.elixir_cost is not None))
    warn_thin("form", Counter(e.attributes.form for e in validated))
    warn_thin("targeting", Counter(t for e in validated for t in e.attributes.targeting))

    no_elixir_count = sum(1 for e in validated if e.attributes.elixir_cost is None)
    if no_elixir_count:
        print(f"NOTE: {no_elixir_count} card(s) have no fixed elixir cost (excluded from elixir-based categories)")

    return validated
