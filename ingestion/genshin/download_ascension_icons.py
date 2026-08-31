"""
Downloads icons for the 3 ascension-related material dimensions (local
specialty, common/enemy-drop material, boss material), sorted into their
own subfolder under output/icons/ascension/ so completeness is easy to
eyeball against the known counts (59/19/47) rather than hunting through one
flat 125-file list. Safe to do - the three dimensions' distinct material
names never overlap (verified: local & common & boss = empty
intersections, and 59+19+47 = 125 = the total distinct count), so no name
ever needs to land in two folders.

Sourced from Project Yatta's asset mirror
(https://gi.yatta.moe/assets/UI/{code}.png) - NOT Enka, despite
download_icons.py using Enka for character icons. Enka 404s on ~25% of
these (31/125, verified on an earlier run) - all materials tied to
recently-added characters its mirror hasn't caught up on yet. Yatta covered
100% of what was needed (all 125, including every one of those 31), so
there's no reason to keep a two-CDN fallback for this specific script.

A material's own "UI_ItemIcon_..." code comes from MaterialExcelConfigData
(already fetched by fetch_dimbreath.py), resolved by name via
TextMap_MediumEN.json - same join used by build_ascension_materials.py.

Ascension stat (ATK%, CRIT Rate%, etc.) is deliberately NOT covered here -
per project decision it renders as a plain-text label (like Rarity's
"4-Star"/"5-Star" fallback pill), not an icon, so there's nothing to
download for it.

Run fetch_dimbreath.py and build_ascension_materials.py before this - it
reads both raw/dimbreath/MaterialExcelConfigData.json (for name -> icon
code) and output/genshin_ascension_materials.json (for which names are
actually needed).
"""
import time
from collections import defaultdict
from pathlib import Path

import requests

from normalize_genshin import slugify

RAW_DIR = Path(__file__).parent / "raw" / "dimbreath"
ASCENSION_DATA_PATH = Path(__file__).parent / "output" / "genshin_ascension_materials.json"
OUTPUT_DIR = Path(__file__).parent / "output" / "icons" / "ascension"

CDN_BASE_URL = "https://gi.yatta.moe/assets/UI"
REQUEST_DELAY_SECONDS = 0.2

# Attribute key on a character record -> the subfolder its icons land in.
DIMENSIONS = {
    "local_specialty": "local_specialty",
    "common_material": "common_material",
    "boss_material": "boss_material",
}


def load_json(path: Path):
    import json
    return json.loads(path.read_text(encoding="utf-8"))


def build_name_to_icon_code() -> dict[str, str]:
    materials = load_json(RAW_DIR / "MaterialExcelConfigData.json")
    text_map = load_json(RAW_DIR / "TextMap_MediumEN.json")

    by_name: dict[str, list[str]] = defaultdict(list)
    for m in materials:
        h = m.get("nameTextMapHash")
        icon = m.get("icon")
        if h is None or not icon:
            continue
        name = text_map.get(str(h))
        if name:
            by_name[name].append(icon)

    resolved = {}
    for name, codes in by_name.items():
        # A material's real icon always starts "UI_ItemIcon_" - a handful
        # of names collide with an unrelated TCG card-back asset
        # ("UI_Gcg_CardBack_...") that happens to reuse the same display
        # name (verified: Cecilia, Dandelion Seed, Glaze Lily, Dendrobium -
        # all 4 have a real UI_ItemIcon_ code alongside the card-back one).
        item_codes = [c for c in set(codes) if c.startswith("UI_ItemIcon_")]
        if item_codes:
            resolved[name] = item_codes[0]
    return resolved


def needed_material_names() -> dict[str, str]:
    """Every distinct material name that needs an icon, mapped to which
    dimension folder it belongs in."""
    data = load_json(ASCENSION_DATA_PATH)
    chars = data["characters"] + [data["traveler"]]
    names: dict[str, str] = {}
    for c in chars:
        for attr, folder in DIMENSIONS.items():
            value = c.get(attr)
            if value:
                names[value] = folder
    return names


def download_icon(dest: Path, icon_code: str) -> str:
    if dest.exists():
        return "skipped (already downloaded)"

    url = f"{CDN_BASE_URL}/{icon_code}.png"
    resp = requests.get(url, timeout=15)
    if resp.status_code == 404:
        return f"MISSING: {url}"
    resp.raise_for_status()
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(resp.content)
    return "downloaded"


def main():
    name_to_icon = build_name_to_icon_code()
    needed = needed_material_names()

    unresolved = sorted(n for n in needed if n not in name_to_icon)
    results = {"downloaded": 0, "skipped": 0, "missing": []}

    for name in sorted(needed):
        icon_code = name_to_icon.get(name)
        if not icon_code:
            continue
        folder = needed[name]
        dest = OUTPUT_DIR / folder / f"{slugify(name)}.png"
        outcome = download_icon(dest, icon_code)
        print(f"{folder:18s} {name:50s} {dest.name:50s} {outcome}")
        if outcome == "downloaded":
            results["downloaded"] += 1
            time.sleep(REQUEST_DELAY_SECONDS)
        elif outcome.startswith("skipped"):
            results["skipped"] += 1
        else:
            results["missing"].append(name)

    print(
        f"\n{results['downloaded']} downloaded, {results['skipped']} already present, "
        f"{len(results['missing'])} missing (404 on Yatta), "
        f"{len(unresolved)} unresolved (no icon code found)."
    )
    for folder in DIMENSIONS.values():
        count = len(list((OUTPUT_DIR / folder).glob("*.png"))) if (OUTPUT_DIR / folder).exists() else 0
        expected = len([n for n, f in needed.items() if f == folder])
        print(f"  {folder}: {count}/{expected} icons on disk")
    if results["missing"]:
        print("Missing on Yatta:")
        for name in results["missing"]:
            print(f"  - {name}")
    if unresolved:
        print("Unresolved (no MaterialExcelConfigData entry found at all):")
        for name in unresolved:
            print(f"  - {name}")


if __name__ == "__main__":
    main()
