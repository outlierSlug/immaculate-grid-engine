"""
Generic Entity schema for the Brawl Stars ingestion pipeline.
"""
from pydantic import BaseModel


class BrawlStarsAttributes(BaseModel):
    rarity: str
    brawler_class: str | None  # None for the small number of "Unknown"-class brawlers
    traits: list[str]  # [] for brawlers with no passive trait, hand-curated - see backfill_brawler_traits.py
    tags: list[str]  # [] for brawlers with no tags - non-mutually-exclusive flags, see backfill_brawler_tags.py
    release_year: int  # mutually-exclusive scalar, same shape as rarity - see backfill_brawler_release_years.py


class Entity(BaseModel):
    id: str
    game_id: str
    display_name: str
    image_url: str
    attributes: BrawlStarsAttributes


def validate_entities(raw_entities: list[dict]) -> list[Entity]:
    validated = [Entity(**e) for e in raw_entities]

    ids = [e.id for e in validated]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate entity IDs found in dataset")

    from collections import Counter
    rarity_counts = Counter(e.attributes.rarity for e in validated)
    thin = {r: n for r, n in rarity_counts.items() if n < 3}
    if thin:
        print(f"WARNING: thin rarity categories (fewer than 3 entities): {thin}")

    unknown_class_count = sum(1 for e in validated if e.attributes.brawler_class is None)
    if unknown_class_count:
        print(f"NOTE: {unknown_class_count} brawlers have no classified class (excluded from class-based categories)")

    trait_counts = Counter(t for e in validated for t in e.attributes.traits)
    thin_traits = {t: n for t, n in trait_counts.items() if n < 3}
    if thin_traits:
        print(f"WARNING: thin trait categories (fewer than 3 entities): {thin_traits}")

    tag_counts = Counter(t for e in validated for t in e.attributes.tags)
    thin_tags = {t: n for t, n in tag_counts.items() if n < 3}
    if thin_tags:
        print(f"WARNING: thin tag categories (fewer than 3 entities): {thin_tags}")

    year_counts = Counter(e.attributes.release_year for e in validated)
    thin_years = {y: n for y, n in year_counts.items() if n < 3}
    if thin_years:
        print(f"WARNING: thin release_year categories (fewer than 3 entities): {thin_years}")

    return validated