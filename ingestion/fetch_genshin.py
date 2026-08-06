"""
Phase 0 step 1: pull raw Genshin character data and save it UNTOUCHED to
/ingestion/raw/. normalize.py does the transformation as a separate step.

Source: genshindev/api, hosted at https://genshin.jmp.blue
https://github.com/genshindev/api
"""
import json
from pathlib import Path

import requests

RAW_DIR = Path(__file__).parent / "raw"
RAW_DIR.mkdir(exist_ok=True)

BASE_URL = "https://genshin.jmp.blue"


def fetch_all_characters() -> list[dict]:
    resp = requests.get(f"{BASE_URL}/characters/all", params={"lang": "en"})
    resp.raise_for_status()
    data = resp.json()
    # /characters/all returns a dict keyed by character id - normalize to a list
    # TODO: confirm this shape once you've actually hit the endpoint; adjust
    # if it comes back as a list already.
    if isinstance(data, dict):
        return [{"_slug": slug, **detail} for slug, detail in data.items()]
    return data


if __name__ == "__main__":
    data = fetch_all_characters()
    out_path = RAW_DIR / "genshin_characters_raw.json"
    out_path.write_text(json.dumps(data, indent=2))
    print(f"Wrote {len(data)} raw records to {out_path}")