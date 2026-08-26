"""
Downloads character icon images from the FortOfFans/HSR community mirror
(raw.githubusercontent.com) - a plain unauthenticated asset host serving the
same datamined sprite files this pipeline already reads paths for out of
AvatarConfig.json. Build-time only, same as every other game's ingestion:
run this once (or after normalize.py picks up new characters), commit the
resulting files, never fetched at app runtime.

Saved under output/icons/, filed by normalize.py's slug ({slug}.png) - so a
downloaded file's name already matches what image_url references in
starrail_entities.json, no separate id-mapping step needed here either
(reads output/icon_manifest.json, written by the same normalize.py run this
depends on).
"""
import json
import time
from pathlib import Path

import requests
from PIL import Image

MANIFEST_PATH = Path(__file__).parent / "output" / "icon_manifest.json"
OUTPUT_DIR = Path(__file__).parent / "output" / "icons"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# The mirror serves paths lowercased regardless of AvatarConfig's own casing
# (e.g. "SpriteOutput/AvatarIcon/..." -> "spriteoutput/avataricon/...") -
# confirmed by fetching a sample URL directly during this pipeline's recon.
ICON_BASE_URL = "https://raw.githubusercontent.com/FortOfFans/HSR/main/"

# Characters recent enough that the community mirror hasn't caught up yet -
# Aventurine • Waveflair isn't even released in-game yet at time of writing,
# Robin • Summeretto is the newest release. Both are real, confirmed
# playable characters (not test data), just missing from FortOfFans/HSR -
# hand-curated fallback to the official wiki's own icon instead. Expected
# to become unnecessary (and safe to remove) once the mirror updates.
WIKI_FALLBACK_URLS = {
    "robin-summeretto": "https://static.wikia.nocookie.net/houkai-star-rail/images/1/18/Character_Robin_%E2%80%A2_Summeretto_Icon.png/",
    "aventurine-waveflair": "https://static.wikia.nocookie.net/houkai-star-rail/images/f/fc/Character_Aventurine_%E2%80%A2_Waveflair_Icon.png/",
}

REQUEST_DELAY_SECONDS = 0.2

# Every icon this script can source (FortOfFans mirror or the wiki fallback)
# comes in as a full-bleed opaque rectangle with no transparent margin - not
# a cutout with padding (unlike Clash Royale's card art) - so "standardize
# dimensions" just means "same canvas size", not "reposition content within
# padding". The mirror's icons are 160x188; the wiki fallback's are already
# 160x160. Cropped from the TOP (not center) since that's where the head
# is - a center-crop would clip hair/head accessories on several
# characters. Square, not the mirror's native 160x188, so it exactly
# matches the aspect-square CSS treatment (see games.ts) with zero cropping
# left for the browser to do at render time.
TARGET_SIZE = (160, 160)


def standardize(dest: Path) -> None:
    img = Image.open(dest)
    if img.size == TARGET_SIZE:
        return
    if img.size[0] < TARGET_SIZE[0] or img.size[1] < TARGET_SIZE[1]:
        return  # smaller than target in some dimension - leave alone, don't upscale/fabricate content
    img.crop((0, 0, TARGET_SIZE[0], TARGET_SIZE[1])).save(dest)


def download_icon(slug: str, icon_path: str) -> str:
    dest = OUTPUT_DIR / f"{slug}.png"
    if dest.exists():
        return "skipped (already downloaded)"

    url = ICON_BASE_URL + icon_path.lower()
    resp = requests.get(url, timeout=15)
    if resp.status_code == 404 and slug in WIKI_FALLBACK_URLS:
        url = WIKI_FALLBACK_URLS[slug]
        resp = requests.get(url, timeout=15)
    if resp.status_code == 404:
        return f"MISSING on CDN: {url}"
    resp.raise_for_status()
    dest.write_bytes(resp.content)
    standardize(dest)
    return "downloaded"


if __name__ == "__main__":
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    results = {"downloaded": 0, "skipped": 0, "missing": []}

    for slug, icon_path in manifest.items():
        outcome = download_icon(slug, icon_path)
        print(f"{slug:40s} {outcome}")
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
        print("Missing (check this character's icon path in the raw cache):")
        for slug in results["missing"]:
            print(f"  - {slug}")
