"""
Downloads the raw game-data-mining files needed to derive ascension
materials (gemstone, boss material, local specialty, common material,
special ascension stat) per character, from Dimbreath's AnimeGameData
mirror - see build_ascension_materials.py for how these are joined against
our own genshin_characters.json (which stays the source of truth for every
attribute it already owns).

Unlike genshin_characters.json, these files are NOT checked in (see
.gitignore) - they're a large (~30MB), fully regenerable third-party
mirror of the game's own data files, same reasoning as
ingestion/starrail/cache/.
"""
from pathlib import Path

import requests

REPO_RAW_BASE = "https://raw.githubusercontent.com/DimbreathBot/AnimeGameData/main"
OUT_DIR = Path(__file__).parent / "raw" / "dimbreath"

# Only the files build_ascension_materials.py actually needs - not a full
# clone of the ~7GB repo. AvatarExcelConfigData maps a character to its
# avatarPromoteId (joined to our own roster via iconName - the same
# "UI_AvatarIcon_X" convention ENKA_ICON_MAP already uses).
# AvatarPromoteExcelConfigData has the per-ascension-phase cost items and
# the special stat unlocked at ascension. MaterialExcelConfigData resolves
# a cost item's material id to its materialType/nameTextMapHash.
# TextMap_MediumEN resolves any nameTextMapHash to its English string (the
# "Medium" variant excludes quest/dialogue text this doesn't need, ~20MB
# instead of the full TextMapEN's ~54MB).
FILES = [
    "ExcelBinOutput/AvatarExcelConfigData.json",
    "ExcelBinOutput/AvatarPromoteExcelConfigData.json",
    "ExcelBinOutput/MaterialExcelConfigData.json",
    "TextMap/TextMap_MediumEN.json",
]


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for rel_path in FILES:
        url = f"{REPO_RAW_BASE}/{rel_path}"
        dest = OUT_DIR / Path(rel_path).name
        print(f"Fetching {rel_path} -> {dest.relative_to(Path(__file__).parent)}")
        resp = requests.get(url, timeout=120)
        resp.raise_for_status()
        dest.write_bytes(resp.content)
        print(f"  {len(resp.content) / 1_000_000:.1f} MB")


if __name__ == "__main__":
    main()
