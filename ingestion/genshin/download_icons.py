"""
Downloads character icon images from Enka Network (https://enka.network/ui/)
for every entry in normalize_genshin.py's ENKA_ICON_MAP, plus the two
Traveler gender icons - the same icon codes/URL structure normalize_genshin
already uses to build each GridItem's image_url. Build-time only, same as
every other ingestion script: run this once (or after ENKA_ICON_MAP gains
new characters), commit the resulting files, never fetched at app runtime.

Saved under output/icons/, filed by the same slug normalize_genshin uses
for a character's GridItem id, so a downloaded file's name already matches
what the eventual self-hosted image_url will need to reference - no
separate id-mapping step when this gets wired into get_image_url() later.
"""
import time
from pathlib import Path

import requests

from normalize_genshin import ENKA_ICON_MAP, TRAVELER_GENDERS, slugify

OUTPUT_DIR = Path(__file__).parent / "output" / "icons"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

BASE_URL = "https://enka.network/ui"
# Polite pacing against a free, community-run API - no published rate limit,
# but there's no reason to hammer it just because downloads are sequential.
REQUEST_DELAY_SECONDS = 0.2


def targets() -> list[tuple[str, str]]:
    """(output filename stem, Enka icon code) for every character this
    project actually uses an Enka icon for."""
    # "Traveler" itself is a dead entry for this purpose: map_character()
    # special-cases the name entirely and only ever builds GridItems (and
    # their icons) from TRAVELER_GENDERS below - the base ENKA_ICON_MAP
    # entry is never passed to get_image_url() for a real character.
    items = [(slugify(name), icon) for name, icon in ENKA_ICON_MAP.items() if name != "Traveler"]
    items += [(f"traveler-{gender_id}", icon) for gender_id, _, _, icon in TRAVELER_GENDERS]
    return items


def download_icon(slug: str, icon_code: str) -> str:
    dest = OUTPUT_DIR / f"{slug}.png"
    if dest.exists():
        return "skipped (already downloaded)"

    url = f"{BASE_URL}/{icon_code}.png"
    resp = requests.get(url, timeout=15)
    if resp.status_code == 404:
        return f"MISSING on Enka: {url}"
    resp.raise_for_status()
    dest.write_bytes(resp.content)
    return "downloaded"


if __name__ == "__main__":
    results = {"downloaded": 0, "skipped": 0, "missing": []}

    for slug, icon_code in targets():
        outcome = download_icon(slug, icon_code)
        print(f"{slug:35s} {outcome}")
        if outcome == "downloaded":
            results["downloaded"] += 1
            time.sleep(REQUEST_DELAY_SECONDS)
        elif outcome.startswith("skipped"):
            results["skipped"] += 1
        else:
            results["missing"].append(slug)

    print(
        f"\n{results['downloaded']} downloaded, {results['skipped']} already present, "
        f"{len(results['missing'])} missing."
    )
    if results["missing"]:
        print("Missing (Enka has no icon at this URL - check ENKA_ICON_MAP's code for these):")
        for slug in results["missing"]:
            print(f"  - {slug}")
