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
import json
import time
from pathlib import Path

import requests

from normalize import slugify

RAW_PATH = Path(__file__).parent / "raw" / "brawlstars_brawlers_raw.json"
OUTPUT_DIR = Path(__file__).parent / "output" / "icons"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Polite pacing against a free, community-run API - no published rate limit,
# but there's no reason to hammer it just because downloads are sequential.
REQUEST_DELAY_SECONDS = 0.2


def targets() -> list[tuple[str, str]]:
    """(output filename stem, Brawlify image URL) for every released brawler -
    unreleased ones aren't real puzzle answers yet (see normalize.py)."""
    raw_records = json.loads(RAW_PATH.read_text())
    return [
        (slugify(r["name"]), r["imageUrl"])
        for r in raw_records
        if r.get("released", False)
    ]


def download_icon(slug: str, url: str) -> str:
    dest = OUTPUT_DIR / f"{slug}.png"
    if dest.exists():
        return "skipped (already downloaded)"

    resp = requests.get(url, timeout=15)
    if resp.status_code == 404:
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
