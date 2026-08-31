"""
Derives ascension materials (local specialty, boss material, common/enemy-
drop material tiers, special ascension stat) per character, from the raw
Dimbreath files fetch_dimbreath.py downloads. genshin_characters.json stays
the source of truth for every attribute it already owns (element/weapon/
rarity/region/model/release) - this script only produces a SEPARATE,
review-first output (genshin_ascension_materials.json) for the new
ascension-related fields. Nothing here writes back into genshin_characters.
json or genshin_entities.json - merging happens as a later, deliberate step
once this output's been reviewed.

Structure of a character's AvatarPromoteExcelConfigData entries, verified
against Albedo's known-correct real materials (Prithiva Topaz/Basalt
Pillar/Cecilia/Divining-Sealed-Forbidden Curse Scroll):
  - costItems[0]: the elemental gemstone (tiered Sliver/Fragment/Chunk/
    Gemstone) - SKIPPED in the output; it's 1:1 with `element`, which
    already exists as its own category.
  - costItems[1]: the boss material - absent at promoteLevel 1 (level 20,
    before the first boss-material ascension requirement), constant name
    from promoteLevel 2 onward.
  - costItems[2]: the local specialty - materialType MATERIAL_EXCHANGE,
    constant name across every promoteLevel, increasing count only.
  - costItems[3]: the common/enemy-drop material - present from
    promoteLevel 1, changes name at 3 tiers (e.g. Divining/Sealed/
    Forbidden Curse Scroll) - NOT collapsed into one "family" label here;
    that needs a small hand-built lookup we haven't built yet, so this
    just reports the 3 raw tier names for review.
  - addProps: always 3 base-stat entries (HP/DEF/ATK) plus exactly one
    more - the character's special ascension stat. Its propType (e.g.
    FIGHT_PROP_ROCK_ADD_HURT) is present on every entry including
    promoteLevel 0, even before it has a numeric value, so it can be read
    off any entry.
"""
import json
from pathlib import Path

from normalize_genshin import ENKA_ICON_MAP, TRAVELER_GENDERS

RAW_DIR = Path(__file__).parent / "raw" / "dimbreath"
CHARACTERS_PATH = Path(__file__).parent / "raw" / "genshin_characters.json"
OUTPUT_PATH = Path(__file__).parent / "output" / "genshin_ascension_materials.json"

# Closed, well-known set (Genshin's playable-character ascension stat is
# always one of these) - anything encountered outside this map is reported
# as unmapped rather than guessed at.
FIGHT_PROP_LABELS = {
    "FIGHT_PROP_HP_PERCENT": "HP%",
    "FIGHT_PROP_ATTACK_PERCENT": "ATK%",
    "FIGHT_PROP_DEFENSE_PERCENT": "DEF%",
    "FIGHT_PROP_CRITICAL": "CRIT Rate%",
    "FIGHT_PROP_CRITICAL_HURT": "CRIT DMG%",
    "FIGHT_PROP_CHARGE_EFFICIENCY": "Energy Recharge%",
    "FIGHT_PROP_ELEMENT_MASTERY": "Elemental Mastery",
    "FIGHT_PROP_HEAL_ADD": "Healing Bonus%",
    "FIGHT_PROP_FIRE_ADD_HURT": "Pyro DMG Bonus%",
    "FIGHT_PROP_ELEC_ADD_HURT": "Electro DMG Bonus%",
    "FIGHT_PROP_WATER_ADD_HURT": "Hydro DMG Bonus%",
    "FIGHT_PROP_GRASS_ADD_HURT": "Dendro DMG Bonus%",
    "FIGHT_PROP_WIND_ADD_HURT": "Anemo DMG Bonus%",
    "FIGHT_PROP_ICE_ADD_HURT": "Cryo DMG Bonus%",
    "FIGHT_PROP_ROCK_ADD_HURT": "Geo DMG Bonus%",
    "FIGHT_PROP_PHYSICAL_ADD_HURT": "Physical DMG Bonus%",
}
BASE_STAT_PROPS = {"FIGHT_PROP_BASE_HP", "FIGHT_PROP_BASE_ATTACK", "FIGHT_PROP_BASE_DEFENSE"}

# Strips the known tier suffixes off a gemstone/boss-material name so
# "Prithiva Topaz Sliver" -> "Prithiva Topaz". Boss materials never carry
# one of these suffixes, so this is a no-op for them.
GEMSTONE_TIER_SUFFIXES = [" Sliver", " Fragment", " Chunk", " Gemstone"]


def strip_tier_suffix(name: str) -> str:
    for suffix in GEMSTONE_TIER_SUFFIXES:
        if name.endswith(suffix):
            return name[: -len(suffix)]
    return name


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main():
    avatars = load_json(RAW_DIR / "AvatarExcelConfigData.json")
    promotes = load_json(RAW_DIR / "AvatarPromoteExcelConfigData.json")
    materials = load_json(RAW_DIR / "MaterialExcelConfigData.json")
    text_map = load_json(RAW_DIR / "TextMap_MediumEN.json")
    characters = load_json(CHARACTERS_PATH)

    material_by_id = {m["id"]: m for m in materials if "id" in m}

    def resolve_text(text_hash) -> str:
        return text_map.get(str(text_hash), f"<unresolved:{text_hash}>")

    # icon name -> [avatarPromoteId, ...] - a list, not a single value,
    # since Traveler's elemental variants all share "UI_AvatarIcon_PlayerBoy"
    # /"UI_AvatarIcon_PlayerGirl" and need to be reported as ambiguous
    # rather than silently resolved to whichever one happens to come first.
    #
    # useType == "AVATAR_FORMAL" filters out trial/test/NPC avatar rows that
    # reuse a real character's icon as a placeholder (verified against
    # Jean: her real entry is id 10000003/useType AVATAR_FORMAL/qualityType
    # QUALITY_ORANGE (5-star); 9 decoy entries under the same icon all have
    # useType None and qualityType QUALITY_PURPLE (4-star), which doesn't
    # even match her real rarity). Without this filter, 8 real characters'
    # icons each resolved to 2-10 candidate avatarPromoteIds instead of 1.
    # id >= 10000900 is a second, disposable "trial mode" copy of a real
    # character that Spiral Abyss/event trial content spawns - AVATAR_FORMAL
    # doesn't exclude these (verified against Hu Tao/Mavuika/Columbina/
    # Ineffa, whose real entries all sit at their normal id, each with a
    # 10000901-10000904 twin). A real character has never been assigned an
    # id in this range, so this is safe as a flat threshold rather than a
    # per-character exception list.
    TRIAL_COPY_ID_THRESHOLD = 10000900

    promote_ids_by_icon: dict[str, list[int]] = {}
    for a in avatars:
        if a.get("useType") != "AVATAR_FORMAL":
            continue
        if a.get("id", 0) >= TRIAL_COPY_ID_THRESHOLD:
            continue
        icon = a.get("iconName")
        promote_id = a.get("avatarPromoteId")
        if not icon or promote_id is None:
            continue
        promote_ids_by_icon.setdefault(icon, []).append(promote_id)

    promotes_by_id: dict[int, list[dict]] = {}
    for p in promotes:
        promotes_by_id.setdefault(p["avatarPromoteId"], []).append(p)
    for entries in promotes_by_id.values():
        entries.sort(key=lambda e: e.get("promoteLevel", 0))

    def extract_for_promote_id(promote_id: int) -> dict:
        entries = promotes_by_id.get(promote_id, [])

        boss_material = None
        local_specialty = None
        common_material_tiers: list[str] = []
        seen_common_tiers: set[str] = set()

        for entry in entries:
            cost_items = entry.get("costItems", [])
            for slot_index, item in enumerate(cost_items):
                if "id" not in item:
                    continue
                material = material_by_id.get(item["id"])
                if not material:
                    continue
                name = resolve_text(material["nameTextMapHash"])
                if slot_index == 1 and boss_material is None:
                    boss_material = name
                elif slot_index == 2 and local_specialty is None:
                    local_specialty = name
                elif slot_index == 3 and name not in seen_common_tiers:
                    seen_common_tiers.add(name)
                    common_material_tiers.append(name)

        ascension_stat_prop = None
        for entry in entries:
            for prop in entry.get("addProps", []):
                prop_type = prop.get("propType")
                if prop_type and prop_type not in BASE_STAT_PROPS:
                    ascension_stat_prop = prop_type
                    break
            if ascension_stat_prop:
                break

        return {
            "boss_material": strip_tier_suffix(boss_material) if boss_material else None,
            "local_specialty": local_specialty,
            "common_material_tiers": common_material_tiers,
            # The chosen category value for the common-material dimension -
            # the 3rd (highest-rarity) tier, per project decision: its icon
            # is the most detailed/distinct of the 3, so it's what a player
            # will actually recognize, unlike the family's lower tiers
            # which are visually closer to other families' low tiers.
            "common_material": common_material_tiers[-1] if common_material_tiers else None,
            "ascension_stat_prop": ascension_stat_prop,
            "ascension_stat_label": FIGHT_PROP_LABELS.get(ascension_stat_prop, f"<unmapped:{ascension_stat_prop}>")
            if ascension_stat_prop
            else None,
        }

    results = []
    unresolved = []
    ambiguous = []

    for c in characters:
        name = c["name"]
        if name == "Traveler":
            # Handled separately below - one display name maps to 10 actual
            # entities (2 genders x 5+ elements), each with its own
            # avatarPromoteId sharing the same iconName.
            continue

        icon = ENKA_ICON_MAP.get(name)
        if not icon:
            unresolved.append(name)
            continue

        promote_id_candidates = promote_ids_by_icon.get(icon, [])
        if len(promote_id_candidates) == 0:
            unresolved.append(name)
            continue
        if len(promote_id_candidates) > 1:
            ambiguous.append({"name": name, "icon": icon, "avatarPromoteIds": promote_id_candidates})
            continue

        data = extract_for_promote_id(promote_id_candidates[0])
        results.append({"name": name, **data})

    # Traveler: every element shares one identical ascension record (same
    # materials, same stat) - confirmed against real game knowledge, not
    # just an assumption, and matches what the data itself shows (Traveler
    # ascends on Brilliant Diamond, a gemstone with no elemental variants,
    # unlike every other character). So there's exactly one true record to
    # find, not one per element. Both PlayerBoy/PlayerGirl icons still
    # resolve to >1 avatarPromoteId candidate even after the trial-copy id
    # filter above (ids in this case are just under that filter's
    # threshold) - disambiguated here by data completeness instead: the
    # real entry is the only one with a non-null local_specialty, the
    # others are empty leftover/placeholder promote tables.
    traveler_data = None
    for _gender_id, gender_name, _model, icon in TRAVELER_GENDERS:
        for pid in promote_ids_by_icon.get(icon, []):
            candidate = extract_for_promote_id(pid)
            if candidate["local_specialty"] is None:
                continue
            if traveler_data is None:
                traveler_data = candidate
            elif candidate != traveler_data:
                print(f"WARNING: Traveler candidates disagree ({gender_name} avatarPromoteId={pid}): "
                      f"{candidate} vs {traveler_data}")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(
            {
                "characters": results,
                "traveler": traveler_data,
                "unresolved": unresolved,
                "ambiguous": ambiguous,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    print(f"Resolved: {len(results)} / {len(characters) - 1}")  # -1 for the single Traveler record
    print(f"Unresolved (no icon/no promote match): {len(unresolved)} -> {unresolved}")
    print(f"Ambiguous (multiple avatarPromoteId candidates): {len(ambiguous)} -> {[a['name'] for a in ambiguous]}")
    print(f"Traveler resolved: {traveler_data}")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
