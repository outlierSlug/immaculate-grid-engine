# Brawler class (Tank/Assassin/Controller/...), read from the wiki data
# fetch_brawler_classes.py pulls into raw/brawler_classes_wiki.json - see
# that script for why the wiki rather than BrawlAPI, which repurposed its
# own `class` field to a per-brawler tagline and left no taxonomy anywhere
# in the response.
#
# This was a hand-curated 106-entry table between 2026-09-07 and 2026-09-23,
# built by merging the last API fetch that still had the taxonomy with the
# 19 brawlers it had always reported as "Unknown". That worked, but it could
# only ever be a snapshot: Supercell reclassifies brawlers occasionally, and
# a frozen table has no way to notice. It had already drifted on two by the
# time it was replaced (Chuck: Damage Dealer -> Controller, Penny: Artillery
# -> Controller), which the wiki had tracked all along. Unlike release
# years/tags/traits - which the API genuinely doesn't expose anywhere, so
# they stay hand-curated in their own backfill modules - class has a real
# source, so it's fetched rather than curated.
#
# normalize.py treats a missing entry for a *released* brawler as fatal
# (KeyError, not a silent null), so a newly-released brawler the wiki hasn't
# classified yet fails loudly rather than loading with no class.
import json
from pathlib import Path

WIKI_CLASSES_PATH = Path(__file__).parent / "raw" / "brawler_classes_wiki.json"

# For a brawler the wiki has wrong, hasn't classified yet, or names
# differently from the API. Empty today: the last full check (2026-09-23,
# 109 brawlers) agreed with the game on every one. Anything added here
# should say why, since it's overriding the source of truth.
MANUAL_OVERRIDES: dict[str, str] = {}

KNOWN_CLASSES: dict[str, str] = {
    **json.loads(WIKI_CLASSES_PATH.read_text(encoding="utf-8")),
    **MANUAL_OVERRIDES,
}
