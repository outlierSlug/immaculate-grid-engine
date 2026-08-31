"""
Parses the two wiki-copy-pasted tables (raw/wiki_ascension_materials_table.txt,
raw/wiki_ascension_stats_table.txt) into structured JSON, and diffs the
materials table against the Dimbreath-derived output (see
build_ascension_materials.py) - an independent, human-sourced cross-check
of the datamined extraction, not a replacement source of truth on its own.

Both wiki files are a raw copy-paste of a wiki table into a text file, not
TSV/CSV - each cell landed on its own line, with no delimiter between rows.
Block boundaries are found by anchoring on known character names (from
genshin_characters.json) rather than assuming a fixed line count per
character, since one row (Traveler) has a genuinely different shape - see
its own handling below.

Materials table row shape, discovered by inspection (verified against
Albedo's known-correct materials): after the character name, each block is
    <element>
    <short name>                      (omitted for the Traveler row)
    <gem> Sliver
    <gem> Fragment
    <gem> Chunk
    <gem> Gemstone
    <blank line>
    <gem family name>\t
    <local specialty>
    <local specialty, duplicate>      (a soft-hyphenated wrap variant)
    <common tier 1>
    <common tier 1, duplicate>
    <common tier 2>
    <common tier 2, duplicate>
    <common tier 3>
    <common tier 3, duplicate>
    <boss material>
    <boss material, duplicate>        (Traveler's row has only one - "None")
The "duplicate" lines are the wiki's own icon alt-text/tooltip column
copy-pasted alongside the visible text column - always discarded in favor
of the first (plain) occurrence.
"""
import json
from pathlib import Path

RAW_DIR = Path(__file__).parent / "raw"
OUTPUT_DIR = Path(__file__).parent / "output"

CHARACTERS_PATH = RAW_DIR / "genshin_characters.json"
MATERIALS_TABLE_PATH = RAW_DIR / "wiki_ascension_materials_table.txt"
STATS_TABLE_PATH = RAW_DIR / "wiki_ascension_stats_table.txt"
DIMBREATH_OUTPUT_PATH = OUTPUT_DIR / "genshin_ascension_materials.json"

ELEMENTS = {"Anemo", "Geo", "Electro", "Dendro", "Hydro", "Pyro", "Cryo"}
GEM_TIER_SUFFIXES = [" Sliver", " Fragment", " Chunk", " Gemstone"]


def strip_tier_suffix(name: str) -> str:
    for suffix in GEM_TIER_SUFFIXES:
        if name.endswith(suffix):
            return name[: -len(suffix)]
    return name


def parse_materials_table(known_names: list[str]) -> dict[str, dict]:
    lines = MATERIALS_TABLE_PATH.read_text(encoding="utf-8").split("\n")
    stripped = [ln.strip() for ln in lines]
    known_name_set = set(known_names)

    # Block start: a line matching a known name, followed by a line that's
    # either a real element or (Traveler's case) the literal "Traveler" -
    # guards against a material/local-specialty name coincidentally
    # matching a character name.
    starts = []
    for i, ln in enumerate(stripped):
        if ln in known_name_set and i + 1 < len(stripped):
            nxt = stripped[i + 1]
            if nxt in ELEMENTS or nxt == "Traveler":
                starts.append((i, ln))

    results = {}
    for idx, (start_i, name) in enumerate(starts):
        end_i = starts[idx + 1][0] if idx + 1 < len(starts) else len(stripped)
        block = stripped[start_i:end_i]
        element = block[1]

        if name == "Traveler":
            # No short-name line, and only one (unpaired) boss material
            # line, which reads "None" - the base row has no single boss
            # material since it doesn't correspond to one specific element.
            rest = block[2:]
        else:
            rest = block[3:]  # skip name, element, short name

        # rest[0:4] = gem tiers, rest[4] = blank, rest[5] = gem family
        # (unused - element already covers this, see build_ascension_
        # materials.py's own reasoning for skipping the gemstone dimension)
        tail = rest[6:]  # local specialty onward

        def take_pair(offset: int) -> str:
            return tail[offset]

        local_specialty = take_pair(0)
        tier1 = take_pair(2)
        tier2 = take_pair(4)
        tier3 = take_pair(6)
        # index 8 is the boss material's first (plain) occurrence in both
        # shapes - a normal character has a duplicate at index 9 (ignored,
        # same as every other pair above); Traveler's row has nothing past
        # index 8, which reads "None" (it has no single boss material of
        # its own - see the module doc comment).
        boss_material = tail[8] if len(tail) > 8 and tail[8] not in ("None", "") else None

        results[name] = {
            "element": element,
            "local_specialty": local_specialty,
            "common_material_tiers": [tier1, tier2, tier3],
            "boss_material": boss_material,
        }

    return results


def parse_stats_table() -> dict[str, dict]:
    lines = STATS_TABLE_PATH.read_text(encoding="utf-8").splitlines()
    results = {}
    for line in lines:
        cols = line.split("\t")
        if len(cols) < 7 or cols[1] == "Name":
            continue
        name = cols[1].strip()
        results[name] = {
            "hp": cols[2].strip(),
            "atk": cols[3].strip(),
            "def": cols[4].strip(),
            "ascension_stat": cols[5].strip(),
            "ascension_stat_value": cols[6].strip(),
        }
    return results


# Dimbreath's FIGHT_PROP_* labels (see build_ascension_materials.py) always
# carry a trailing "%" for percentage stats; the wiki's own column doesn't -
# normalizing both to the same bare form is what makes them comparable.
def normalize_stat_label(label: str) -> str:
    return label.rstrip("%").strip() if label else label


def main():
    characters = json.loads(CHARACTERS_PATH.read_text(encoding="utf-8"))
    known_names = [c["name"] for c in characters if c["name"] != "Wonderland Manekin"]

    materials = parse_materials_table(known_names)
    stats = parse_stats_table()

    (OUTPUT_DIR / "wiki_ascension_materials.json").write_text(
        json.dumps(materials, indent=2), encoding="utf-8"
    )
    (OUTPUT_DIR / "wiki_ascension_stats.json").write_text(
        json.dumps(stats, indent=2), encoding="utf-8"
    )

    missing_from_wiki_materials = [n for n in known_names if n != "Traveler" and n not in materials]
    missing_from_wiki_stats = [n for n in known_names if n != "Traveler" and n not in stats]
    print(f"Materials table: parsed {len(materials)} characters (of {len(known_names)} known)")
    print(f"  missing: {missing_from_wiki_materials}")
    print(f"Stats table: parsed {len(stats)} characters (of {len(known_names)} known)")
    print(f"  missing: {missing_from_wiki_stats}")

    # ── Diff against the Dimbreath-derived output ──────────────────────
    if not DIMBREATH_OUTPUT_PATH.exists():
        print(f"\n{DIMBREATH_OUTPUT_PATH} not found - run build_ascension_materials.py first to diff.")
        return

    dimbreath = json.loads(DIMBREATH_OUTPUT_PATH.read_text(encoding="utf-8"))
    dimbreath_by_name = {c["name"]: c for c in dimbreath["characters"]}
    if dimbreath.get("traveler"):
        dimbreath_by_name["Traveler"] = dimbreath["traveler"]

    mismatches = []
    matched = 0
    for name, wiki_data in materials.items():
        d = dimbreath_by_name.get(name)
        if not d:
            mismatches.append({"name": name, "issue": "missing from Dimbreath output"})
            continue

        row_mismatches = {}
        if wiki_data["local_specialty"] != d["local_specialty"]:
            row_mismatches["local_specialty"] = {"wiki": wiki_data["local_specialty"], "dimbreath": d["local_specialty"]}
        if wiki_data["boss_material"] != d["boss_material"]:
            row_mismatches["boss_material"] = {"wiki": wiki_data["boss_material"], "dimbreath": d["boss_material"]}
        if wiki_data["common_material_tiers"] != d["common_material_tiers"]:
            row_mismatches["common_material_tiers"] = {
                "wiki": wiki_data["common_material_tiers"],
                "dimbreath": d["common_material_tiers"],
            }

        wiki_stat = stats.get(name, {}).get("ascension_stat")
        dimbreath_stat = normalize_stat_label(d.get("ascension_stat_label"))
        if wiki_stat and normalize_stat_label(wiki_stat) != dimbreath_stat:
            row_mismatches["ascension_stat"] = {"wiki": wiki_stat, "dimbreath": d.get("ascension_stat_label")}

        if row_mismatches:
            mismatches.append({"name": name, **row_mismatches})
        else:
            matched += 1

    diff_report = {"matched": matched, "mismatches": mismatches}
    (OUTPUT_DIR / "ascension_materials_diff.json").write_text(
        json.dumps(diff_report, indent=2), encoding="utf-8"
    )
    print(f"\nDiff vs Dimbreath: {matched} fully matched, {len(mismatches)} with at least one mismatch")
    for m in mismatches:
        print(f"  {m}")
    print(f"\nWrote {OUTPUT_DIR / 'ascension_materials_diff.json'}")


if __name__ == "__main__":
    main()
