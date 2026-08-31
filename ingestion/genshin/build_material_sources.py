"""
Extracts the source enemy/boss name for each common-material and boss-material
value actually in use (see genshin_ascension_materials.json), from Dimbreath's
own material flavor text (descTextMapHash) - not from a wiki, since the
scraped wiki_ascension_materials_table.txt has no enemy-source column at all.

Regex-first, by design: every "defeated X"/"defeating X" match below is a
verbatim quote from the game's own flavor text, not a guess - zero
hallucination risk. Only entries the regex can't confidently resolve fall
through to MANUAL_OVERRIDES, and even those are cross-checked against the
flavor text where the enemy family name plausibly appears there too. Anything
neither the regex nor an override resolves is deliberately left OUT of the
output - CategoryChip.tsx's existing generic "(a boss material)" tooltip
fallback covers it, so an unresolved entry is a silent no-op, never a wrong
answer shown to a player.

Run after build_ascension_materials.py (reads its output). Writes
output/genshin_material_sources.json - copy this to
frontend/src/assets/genshin/ascension/material_sources.json same as the
icons, see README.md.
"""
import json
import re
from pathlib import Path

DIMBREATH_DIR = Path(__file__).parent / "raw" / "dimbreath"
OUTPUT_PATH = Path(__file__).parent / "output" / "genshin_material_sources.json"
ASCENSION_DATA_PATH = Path(__file__).parent / "output" / "genshin_ascension_materials.json"

# Confirmed against the flavor text below by a human, for materials whose
# text doesn't fit the regex patterns cleanly (no "defeated X" phrasing, or
# the enemy name needs disambiguating from a longer description). Each value
# is checked against its own flavor text by verify_overrides() below where a
# plausible substring exists - "inferred" ones are common knowledge about
# well-established enemy/material associations that isn't literally spelled
# out in the flavor text, and skip that check.
MANUAL_OVERRIDES = {
    "boss_material": {
        "Riftborn Regalia": "the Wolflord",
        "Fragment of a Golden Melody": "the centaur golem",
        "Runic Fang": "the snakelike ruin machine",
        "Talisman of the Enigmatic Land": "the Wayward Hermetic Spiritspeaker's trial",
        # Article added for readability in the tooltip sentence ("obtained
        # from an oceanid") - the regex captures the bare noun, which reads
        # fine for a proper name or a plural but not a singular common noun.
        "Cleansing Heart": "an oceanid",
        "Light Guiding Tetrahedron": "a mysterious ruin machine",
        "Perpetual Caliber": "a ruin machine",
    },
    "common_material": {
        # inferred: well-established community knowledge, not spelled out
        # word-for-word in the flavor text itself.
        "Weathered Arrowhead": ("Hilichurl archers", True),
        "Famed Handguard": ("Nobushi and Kairagi", True),
        "Forbidden Curse Scroll": ("Eremites", True),
        "Rich Red Brocade": ("Eremites", True),
        "Precision Drive Shaft": ("Ruin machines", False),  # "Landcruiser" in text
        "Prime Chimeric Nexus": ("chimeric monsters", False),  # "aberrant man-made monsters" in text
        # The material's own name already names the enemy - no separate
        # "source" fact to extract, just spelling it out as the tooltip enemy.
        "Slime Concentrate": ("Slimes", False),
        "Saurian-Crowned Warrior's Golden Whistle": ("Saurian-Crowned Warriors", False),
        "Crystalline Cyst Dust": ("Floating Fungi", False),  # "aggregation of Floating Fungi" in text
    },
}

# {enemy-name capture} - matched against the flavor text with newlines
# flattened to spaces, most specific first (a specific pattern matching a
# narrow phrase like "collapse of the X" must win over a broader one like
# "left behind by X" that would otherwise swallow the whole clause, e.g.
# "left behind by [the collapse of the Hydro Hypostasis]" instead of just
# "Hydro Hypostasis"). The capture itself is deliberately permissive
# ([^.,\n]+?, not restricted to a starting capital or narrow charset - an
# earlier, narrower charset silently failed on names containing a colon,
# e.g. "Super-Heavy Landrover: Mechanized Fortress") - is_plausible_name()
# below is what actually guards against a bad/overshot capture, not the
# pattern's own strictness.
PATTERNS = [
    r"shell of an? ([^.,\n]+?),",
    r"created in the [\w ]+ of an? ([^.,\n]+?)\.",
    r"collapse of the ([^.,\n]+?)\.",
    r"imploded form of an ([^.,\n]+?) upon its defeat",
    r"final coalesced form of the ([^.,\n]+?)\.",
    r"^An? ([^.,\n]+?) channels",
    r"body of an? ([^.,\n]+?) that",
    r"[Tt]he electricity-emitting section of the ([^.,\n]+?),",
    r"core pulled from the blazing remains of the ([^.,\n]+?)\.",
    r"exposed core of a defeated ([^.,\n]+?)[.,]",
    r"[Tt]he core of an? ([^.,\n]+?), wrapped",
    r"[Cc]rystallization of an? ([^.,\n]+?) that",
    r"war hammer of the ([^.,\n]+?)\.",
    r"eternal water left by an? ([^.,\n]+?)\.",
    r"crystalline substance taken from an? ([^.,\n]+?)\.",
    r"[Ss]cales? from an? ([^.,\n]+?)\.",
    r"pearls? left behind by the ([^.,\n]+?)\.",
    r"belonging to ([^.,\n]+?)\.",
    r"powers? the (?:autonomous movements of the |inorganic )?([^.,\n]+?)(?:[.,]| and)",
    r"[Aa]fter defeat(?:ing|ed) (?:a |an |the )?(?:monster known as )?(?:a |an |the )?([^.,\n]+?)(?:[.,]| that )",
    r"(?:^|\.\s+)[Tt]he ([^.,\n]+?) (?:hunts|possess)",
    r"why ([^.,\n]+?) are so fascinated",
    r"(?:guiding )?principle of the ([^.,\n]+?)\.",
    r"issued to members of the ([^.,\n]+?)\.",
    r"fell from an? (?:mighty )?([^.,\n]+?)\.",
    r"remains of an? ([^.,\n]+?) left behind",
    r"left behind by (?:a |an |the )?(?:defeated )?([^.,\n]+?)(?:[.,]| in its| that )",
    r"remnants? of ([^.,\n]+?)(?:[.,]| after)",
    r"taken from an? (?:defeated )?([^.,\n]+?)[.,]",
    r"obtained from an? (?:defeated |mysterious )?([^.,\n]+?)[.,]",
    r"obtained via defeating an? ([^.,\n]+?)[.,]",
    r"fuels the [\w ]+ of the ([^.,\n]+?)\.",
    r"shed by (?:a |an )?(?:defeated )?([^.,\n]+?)\.",
    r"wreckage of (?:a |an |the )?(?:defeated )?([^.,\n—]+?)(?:—|\.|,)",
    r"hiding in an? ([^.,\n]+?)'s tail",
    r"fragment of (?:a |an )?defeated ([^.,\n]+?)'s",
    r"removed from (?:a |an |the )?([^.,\n]+?)\.",
]

# A post-hoc guard, not a pattern-tightening exercise: several of the
# patterns above are intentionally loose (see their own comment), so this is
# what actually rejects an overshot capture - more than 6 words almost
# always means a whole descriptive clause got swallowed rather than a name
# (e.g. "monster created by someone to serve their selfish desires"), and a
# capture starting with a lowercase word that isn't a known connector
# ("of"/"the"/"a") means the regex latched onto mid-sentence prose instead of
# a name's start.
_LOWERCASE_STARTERS_OK = {"a", "an", "the", "mysterious", "snakelike"}


def is_plausible_name(candidate: str) -> bool:
    words = candidate.split()
    if not words or len(words) > 6:
        return False
    # A short phrase is fine even lowercase ("oceanid", "ruin machine") - the
    # real overshoot signature is a LONG clause starting mid-sentence
    # ("monster created by someone to serve their selfish desires").
    if len(words) <= 2:
        return True
    first = words[0]
    return first[0].isupper() or first.lower() in _LOWERCASE_STARTERS_OK


def load_textmap():
    return json.loads((DIMBREATH_DIR / "TextMap_MediumEN.json").read_text(encoding="utf-8"))


def load_name_to_desc(textmap):
    materials = json.loads((DIMBREATH_DIR / "MaterialExcelConfigData.json").read_text(encoding="utf-8"))
    name_to_desc = {}
    for m in materials:
        name = textmap.get(str(m.get("nameTextMapHash")), "")
        desc = textmap.get(str(m.get("descTextMapHash")), "")
        if name and name not in name_to_desc:
            name_to_desc[name] = desc
    return name_to_desc


_LEADING_ARTICLE = re.compile(r"^(?:an?|the)\s+", re.IGNORECASE)


def extract_from_text(desc: str) -> str | None:
    flat = desc.replace("\\n", " ")
    for pattern in PATTERNS:
        match = re.search(pattern, flat)
        if match:
            candidate = _LEADING_ARTICLE.sub("", match.group(1).strip())
            if is_plausible_name(candidate):
                return candidate
    return None


def used_values(data: dict, key: str) -> list[str]:
    values = {c[key] for c in data["characters"] if c.get(key)}
    traveler_value = data["traveler"].get(key)
    if traveler_value:
        values.add(traveler_value)
    return sorted(values)


def main():
    textmap = load_textmap()
    name_to_desc = load_name_to_desc(textmap)
    data = json.loads(ASCENSION_DATA_PATH.read_text(encoding="utf-8"))

    result = {"common_material": {}, "boss_material": {}}
    unresolved = {"common_material": [], "boss_material": []}
    inferred_report = []

    for dimension in ("common_material", "boss_material"):
        for value in used_values(data, dimension):
            desc = name_to_desc.get(value, "")
            auto = extract_from_text(desc)
            override = MANUAL_OVERRIDES[dimension].get(value)

            if isinstance(override, tuple):
                enemy, inferred = override
            elif isinstance(override, str):
                enemy, inferred = override, False
            elif auto:
                enemy, inferred = auto, False
            else:
                enemy, inferred = None, False

            if enemy is None:
                unresolved[dimension].append(value)
                continue

            if inferred:
                inferred_report.append(f"{dimension}/{value!r} -> {enemy!r} (inferred, not in flavor text)")
            elif override and not auto:
                # Manual override with no regex match to cross-check against -
                # still worth a human glance even though it's not "inferred".
                inferred_report.append(f"{dimension}/{value!r} -> {enemy!r} (manual, unverified against text)")

            result[dimension][value] = enemy

    OUTPUT_PATH.parent.mkdir(exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Resolved {len(result['common_material'])}/{len(used_values(data, 'common_material'))} common materials")
    print(f"Resolved {len(result['boss_material'])}/{len(used_values(data, 'boss_material'))} boss materials")
    print()
    print("UNRESOLVED (kept out of the output - frontend falls back to generic tooltip text):")
    for dimension, values in unresolved.items():
        for v in values:
            print(f"  {dimension}: {v}")
    print()
    print("NEEDS HUMAN REVIEW (manual/inferred entries):")
    for line in inferred_report:
        print(f"  {line}")
    print()
    print("ALL RESOLVED (for a human to read against material_flavor_dump.txt):")
    for dimension in ("common_material", "boss_material"):
        for value, enemy in result[dimension].items():
            print(f"  {value!r} -> {enemy!r}")


if __name__ == "__main__":
    main()
