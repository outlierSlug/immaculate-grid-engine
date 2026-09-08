"""
Downloads card icon images from Supercell's own asset CDN
(api-assets.clashroyale.com) - the iconUrls.medium/evolutionMedium/
heroMedium fields already present in raw/clashroyale_cards_raw.json for
every card. Build-time only, same as every other ingestion script: run
this once (or after fetch_clash_royale.py picks up new cards), commit the
resulting files, never fetched at app runtime.

Saved under output/icons/, filed by normalize.py's slug + form suffix
({slug}.png / {slug}-evo.png / {slug}-hero.png) - so a downloaded file's
name already matches what get_image_url() references, no separate
id-mapping step.
"""
import json
import time
from pathlib import Path

import requests

from normalize import slugify

RAW_PATH = Path(__file__).parent / "raw" / "clashroyale_cards_raw.json"
OUTPUT_DIR = Path(__file__).parent / "output" / "icons"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Polite pacing against Supercell's asset CDN - no published rate limit for
# this static-asset host, but no reason to hammer it just because downloads
# are sequential.
REQUEST_DELAY_SECONDS = 0.2

# PLACEHOLDER ICONS (2026-09-07): minion-giant.png and ice-wizard-hero.png
# were both 404ing on Supercell's own CDN the day these cards went live (a
# known asset-rollout lag - see ARCHITECTURE.md/README precedent for other
# games), so these two were instead hand-sourced from RoyaleAPI's card-
# thumbnail mirror (cdns3.royaleapi.com/static/img/cards/{version}/{slug}.png)
# and manually resized/composited onto a transparent 285x420 canvas to match
# every other icon's dimensions - the border/frame style doesn't match
# Supercell's own (same accepted tradeoff as elite-barbarians-evo.png), only
# the character art itself does. Since download_icon() below skips any file
# that already exists, these two will NOT get automatically replaced by a
# future re-run once Supercell's CDN actually has them - delete
# output/icons/minion-giant.png and output/icons/ice-wizard-hero.png by hand,
# then re-run this script, once that's confirmed (check by curling the
# medium/heroMedium URL in raw/clashroyale_cards_raw.json directly).

# (icon_urls key, filename suffix) - mirrors normalize.py's map_card() form
# detection exactly (evolutionMedium -> Evolution entity, heroMedium -> Hero
# entity), so every entity normalize.py produces has a matching icon target
# here.
FORM_ICON_KEYS = [
    ("medium", ""),
    ("evolutionMedium", "-evo"),
    ("heroMedium", "-hero"),
]


def targets() -> list[tuple[str, str]]:
    """(output filename stem, CDN URL) for every icon variant any card has."""
    raw_records = json.loads(RAW_PATH.read_text(encoding="utf-8"))
    items = []
    for raw in raw_records:
        slug = slugify(raw["name"])
        icon_urls = raw["iconUrls"]
        for key, suffix in FORM_ICON_KEYS:
            if key in icon_urls:
                items.append((f"{slug}{suffix}", icon_urls[key]))
    return items


def download_icon(slug: str, url: str) -> str:
    dest = OUTPUT_DIR / f"{slug}.png"
    if dest.exists():
        return "skipped (already downloaded)"

    resp = requests.get(url, timeout=15)
    if resp.status_code == 404:
        return f"MISSING on CDN: {url}"
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
        print("Missing (check this card's iconUrls in the raw fetch):")
        for slug in results["missing"]:
            print(f"  - {slug}")
