"""
Transform the raw Honkai: Star Rail cache (cache/data/*.json + cache/langs/
en.json, downloaded by fetch_star_rail.js via starrail.js) into the generic
Entity schema and write the validated result to output/starrail_entities.json.

Reads directly from the raw datamined cache files rather than through
starrail.js's own object model - gives full control over name/rarity/path/
element resolution, and the JS library is only used to download the cache
and to produce raw/star_rail_characters_raw.json's id list (see that file's
own generating script) - the whitelist of which ids are real, currently-
playable characters.
"""
import json
import re
from collections import Counter
from pathlib import Path

from schema import validate_entities

CACHE_DIR = Path(__file__).parent / "cache"
RAW_ROSTER_PATH = Path(__file__).parent / "raw" / "star_rail_characters_raw.json"
OUTPUT_PATH = Path(__file__).parent / "output" / "starrail_entities.json"
# {slug -> raw CDN-relative icon path (e.g. "SpriteOutput/AvatarIcon/Avatar/
# 1001.png")} - consumed by download_icons.py. A slug is only known for
# certain after the collision pass below (March 7th, Trailblazer), so this
# is written from the SAME loop that builds the final entities rather than
# re-derived independently, which would risk drifting out of sync with the
# actual slugs shipped in starrail_entities.json.
ICON_MANIFEST_PATH = Path(__file__).parent / "output" / "icon_manifest.json"


def slugify(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s)
    return s


def strip_markup(s: str) -> str:
    # Raw text occasionally carries game-internal rich-text tags (e.g.
    # "Silver Wolf LV.<unbreak>999</unbreak>") - strip the tags, keep the
    # inner text.
    return re.sub(r"<[^>]+>", "", s)


def load_json(*parts):
    return json.loads(CACHE_DIR.joinpath(*parts).read_text(encoding="utf-8"))


# Trailblazer (the player protagonist) has no canonical name in the data at
# all - every language's text map literally stores "{NICKNAME}", since
# in-game it's whatever the player typed in. Modeled the same way as
# Genshin's Traveler (one raw record's *shape* -> many independently-
# guessable entities, though here there was never a single raw record to
# begin with - Trailblazer is already 10 separate ids), using the
# community-canonical names Caelus (male)/Stelle (female). AvatarVOTag
# ("playerboy"/"playergirl" + a path-index suffix) is the only field in the
# raw data that distinguishes gender - there's no dedicated gender field.
TRAILBLAZER_IDS = {
    8001: ("Caelus", "Destruction"),
    8002: ("Stelle", "Destruction"),
    8003: ("Caelus", "Preservation"),
    8004: ("Stelle", "Preservation"),
    8005: ("Caelus", "Harmony"),
    8006: ("Stelle", "Harmony"),
    8007: ("Caelus", "Remembrance"),
    8008: ("Stelle", "Remembrance"),
    8009: ("Caelus", "Elation"),
    8010: ("Stelle", "Elation"),
}


def main():
    avatars = load_json("data", "AvatarConfig.json")
    base_types = load_json("data", "AvatarBaseType.json")
    damage_types = load_json("data", "DamageType.json")
    textmap = load_json("langs", "en.json")

    # Both built from the raw data, not hardcoded - self-updating if HSR
    # ever adds another Path/element (as "Elation" apparently already has,
    # after this pipeline was first scoped against an older roster).
    path_display = {k: v["FirstWordText"] for k, v in base_types.items()}
    element_display = {
        k: textmap.get(str(v["DamageTypeName"]["Hash"]), k)
        for k, v in damage_types.items()
    }

    roster_ids = [r["id"] for r in json.loads(RAW_ROSTER_PATH.read_text(encoding="utf-8"))]

    # First pass: resolve every field except the final display_name/id/slug,
    # which depend on whether this name collides with another (e.g. March
    # 7th's two playable identities - Preservation/Ice and The Hunt/
    # Imaginary - share a base name with nothing else in the data to tell
    # them apart). Detecting collisions from the data instead of hardcoding
    # "March 7th" means any future HSR character released the same way is
    # handled automatically.
    drafts = []
    for char_id in roster_ids:
        a = avatars[str(char_id)]
        rarity = int(a["Rarity"][-1])
        path_id = a["AvatarBaseType"]
        element_id = a["DamageType"]
        path_name = path_display.get(path_id, path_id)

        if char_id in TRAILBLAZER_IDS:
            gender, _ = TRAILBLAZER_IDS[char_id]
            base_name = f"Trailblazer – {gender}"
        else:
            raw_name = textmap.get(str(a["AvatarName"]["Hash"]), "")
            base_name = strip_markup(raw_name).strip()

        drafts.append({
            "char_id": char_id,
            "base_name": base_name,
            "path_name": path_name,
            "rarity": rarity,
            "element": element_display.get(element_id, element_id),
            "icon_path": a["DefaultAvatarHeadIconPath"],
        })

    name_counts = Counter(d["base_name"] for d in drafts)

    entities = []
    icon_manifest = {}
    for d in drafts:
        display_name = (
            f"{d['base_name']} ({d['path_name']})"
            if name_counts[d["base_name"]] > 1
            else d["base_name"]
        )
        slug = slugify(display_name)
        icon_manifest[slug] = d["icon_path"]

        entities.append({
            "id": f"starrail:{slug}",
            "game_id": "starrail",
            "display_name": display_name,
            # Self-hosted (see download_icons.py) - filename is this
            # character's own slug, matching every other game's convention.
            "image_url": f"/starrail/icons/{slug}.png",
            "attributes": {
                "rarity": d["rarity"],
                "path": d["path_name"],
                "element": d["element"],
            },
        })

    validated = validate_entities(entities)

    OUTPUT_PATH.parent.mkdir(exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps([e.model_dump() for e in validated], indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Wrote {len(validated)} validated entities to {OUTPUT_PATH}")

    ICON_MANIFEST_PATH.write_text(
        json.dumps(icon_manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"Wrote {len(icon_manifest)} entries to {ICON_MANIFEST_PATH}")


if __name__ == "__main__":
    main()
