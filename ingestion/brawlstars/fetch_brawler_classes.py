"""
Fetches each brawler's class (Tank/Assassin/Controller/...) from the Brawl
Stars wiki, whose per-brawler infobox states it outright (`|Class = Damage
Dealer`) using the same 7-value taxonomy the game does.

Why the wiki rather than the API this pipeline otherwise runs on: BrawlAPI's
`/v1/brawlers` used to return that taxonomy in `class.name` (id 1-7), but
repurposed the field to a unique per-brawler tagline (e.g. {"id": 84,
"name": "Use Walls To Avoid Damage And Get Close."} for Shade, who was plain
"Assassin"). Nothing else in the response carries the taxonomy, so the class
was hand-curated into a 106-entry table for a while. That table then drifted
from the live game without anything noticing: Supercell reclassified Chuck
(Damage Dealer -> Controller) and Penny (Artillery -> Controller), and a
frozen snapshot can't see a reclassification. The wiki tracks them - both
brawlers' own pages log the change - which is the real argument for sourcing
this rather than curating it.

Writes raw/brawler_classes_wiki.json; backfill_brawler_classes.py reads that
and applies any manual override. Build-time only, like every other script
here: re-run it after fetch_brawlstars.py picks up new brawlers, commit the
result, never fetched at app runtime.
"""
import json
import re
import time
import urllib.parse
from pathlib import Path

import requests

RAW_PATH = Path(__file__).parent / "raw" / "brawlstars_brawlers_raw.json"
OUTPUT_PATH = Path(__file__).parent / "raw" / "brawler_classes_wiki.json"

API = "https://brawlstars.fandom.com/api.php"
# The MediaWiki API caps a multi-page query at 50 titles, so the whole
# roster is 3 requests rather than one per brawler.
BATCH_SIZE = 50
REQUEST_DELAY_SECONDS = 0.5

# The game's own 7 classes. An unexpected value means the wiki's infobox
# changed shape (or a page was vandalised) - worth failing on rather than
# silently writing a class no CategoryDefinition will ever match.
VALID_CLASSES = {
    "Artillery",
    "Assassin",
    "Controller",
    "Damage Dealer",
    "Marksman",
    "Support",
    "Tank",
}


def fetch_wikitext(titles: list[str]) -> dict[str, str | None]:
    params = {
        "action": "query",
        "prop": "revisions",
        "rvprop": "content",
        "rvslots": "main",
        "titles": "|".join(titles),
        "format": "json",
        # A brawler's page can sit behind a redirect (punctuation/spelling);
        # resolve it back to the name we asked for so the output is keyed by
        # the API's own name.
        "redirects": "1",
    }
    resp = requests.get(
        f"{API}?{urllib.parse.urlencode(params)}",
        headers={"User-Agent": "GachaGrid ingestion (https://gachagrid.com)"},
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()

    asked_for = {r["to"]: r["from"] for r in data.get("query", {}).get("redirects", [])}
    out: dict[str, str | None] = {}
    for page in data.get("query", {}).get("pages", {}).values():
        title = page.get("title")
        revisions = page.get("revisions")
        name = asked_for.get(title, title)
        out[name] = revisions[0]["slots"]["main"]["*"] if revisions else None
    return out


def class_from_wikitext(wikitext: str | None) -> str | None:
    if not wikitext:
        return None
    match = re.search(r"\|\s*Class\s*=\s*([^|}\n]+)", wikitext)
    return match.group(1).strip() if match else None


def main():
    raw_records = json.loads(RAW_PATH.read_text(encoding="utf-8"))
    names = [r["name"] for r in raw_records]

    wikitext: dict[str, str | None] = {}
    for i in range(0, len(names), BATCH_SIZE):
        batch = names[i : i + BATCH_SIZE]
        wikitext.update(fetch_wikitext(batch))
        if i + BATCH_SIZE < len(names):
            time.sleep(REQUEST_DELAY_SECONDS)

    classes: dict[str, str] = {}
    unresolved: list[str] = []
    unexpected: list[tuple[str, str]] = []
    for name in names:
        value = class_from_wikitext(wikitext.get(name))
        if value is None:
            unresolved.append(name)
        elif value not in VALID_CLASSES:
            unexpected.append((name, value))
        else:
            classes[name] = value

    if unexpected:
        raise SystemExit(
            "Wiki returned a class outside the known taxonomy - check the infobox format "
            f"before trusting this run: {unexpected}"
        )

    OUTPUT_PATH.write_text(
        json.dumps(dict(sorted(classes.items())), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(classes)} brawler classes to {OUTPUT_PATH}")
    counts: dict[str, int] = {}
    for value in classes.values():
        counts[value] = counts.get(value, 0) + 1
    for value, count in sorted(counts.items()):
        print(f"  {value:15s} {count}")
    if unresolved:
        # Not fatal here - normalize.py is what decides whether a missing
        # class matters, and it only matters for a *released* brawler.
        print(f"\nNo Class in the infobox ({len(unresolved)}): {unresolved}")


if __name__ == "__main__":
    main()
