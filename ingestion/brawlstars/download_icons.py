"""
Downloads brawler icon images from Brawlify's CDN - the imageUrl field
already present in raw/brawlstars_brawlers_raw.json for every released
brawler, the same URL normalize.py used to build image_url with directly
before it switched to a self-hosted path. Build-time only, same as every
other ingestion script: run this once (or after fetch_brawlstars.py picks
up new brawlers), commit the resulting files, never fetched at app runtime.

Saved under output/icons/, filed by normalize.py's slugify(name) - so a
downloaded file's name already matches what get_image_url() references,
no separate id-mapping step.
"""
import io
import json
import time
from pathlib import Path

import requests
from PIL import Image

from normalize import ANNOUNCED_NOT_YET_PLAYABLE, slugify

RAW_PATH = Path(__file__).parent / "raw" / "brawlstars_brawlers_raw.json"
OUTPUT_DIR = Path(__file__).parent / "output" / "icons"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Polite pacing against a free, community-run API - no published rate limit,
# but there's no reason to hammer it just because downloads are sequential.
REQUEST_DELAY_SECONDS = 0.2

# Brawlify's icons are all 200x200.
TARGET_SIZE = (200, 200)

# Brawlers Brawlify's CDN doesn't have an icon for yet - it lagged Cosmo's
# release by weeks (still a 404 on all three of its icon variants the day he
# became free to unlock). The fallback is the Brawl Stars wiki's own copy of
# the brawler's first profile icon ("<Name>1-pfp.png"): the same in-game
# portrait Brawlify's bordered icons are made from, black border included,
# just framed slightly tighter and at a larger size - checked side by side
# against Wendy/Nori/Bolt/Shelly before using it. ?format=original stops the
# wiki's CDN from transcoding the PNG to WebP. Expected to become unnecessary
# (and safe to remove, along with the downloaded file so the Brawlify copy
# replaces it) once Brawlify catches up.
WIKI_FALLBACK_URLS = {
    "cosmo": "https://static.wikia.nocookie.net/brawlstars/images/7/75/Cosmo1-pfp.png/revision/latest?format=original",
}


def targets() -> list[tuple[str, str]]:
    """(output filename stem, Brawlify image URL) for every brawler
    normalize.py keeps - unreleased or announced-only ones aren't real puzzle
    answers yet."""
    raw_records = json.loads(RAW_PATH.read_text())
    return [
        (slugify(r["name"]), r["imageUrl"])
        for r in raw_records
        if r.get("released", False) and r["name"] not in ANNOUNCED_NOT_YET_PLAYABLE
    ]


def download_from_wiki(slug: str, dest: Path) -> str:
    url = WIKI_FALLBACK_URLS[slug]
    resp = requests.get(
        url,
        headers={"User-Agent": "GachaGrid ingestion (https://gachagrid.com)"},
        timeout=15,
    )
    if resp.status_code == 404:
        return f"MISSING on Brawlify and the wiki: {url}"
    resp.raise_for_status()
    img = Image.open(io.BytesIO(resp.content)).convert("RGBA")
    img.resize(TARGET_SIZE, Image.LANCZOS).save(dest, format="PNG")
    return "downloaded"


def download_icon(slug: str, url: str) -> str:
    dest = OUTPUT_DIR / f"{slug}.png"
    if dest.exists():
        return "skipped (already downloaded)"

    resp = requests.get(url, timeout=15)
    if resp.status_code == 404:
        if slug in WIKI_FALLBACK_URLS:
            return download_from_wiki(slug, dest)
        return f"MISSING on Brawlify: {url}"
    resp.raise_for_status()
    dest.write_bytes(resp.content)
    return "downloaded"


if __name__ == "__main__":
    results = {"downloaded": 0, "skipped": 0, "missing": []}

    for slug, url in targets():
        outcome = download_icon(slug, url)
        print(f"{slug:25s} {outcome}")
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
        print("Missing (check this brawler's imageUrl in the raw fetch):")
        for slug in results["missing"]:
            print(f"  - {slug}")
