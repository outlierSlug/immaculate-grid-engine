"""
Phase 2

https://brawlapi.com/
"""
import json
from pathlib import Path

import requests

RAW_DIR = Path(__file__).parent / "raw"
RAW_DIR.mkdir(exist_ok=True)

BASE_URL = "https://api.brawlapi.com/v1"


def fetch_all_brawlers() -> list[dict]:
    resp = requests.get(f"{BASE_URL}/brawlers")
    resp.raise_for_status()
    data = resp.json()
    return data["list"]  # response is wrapped in {"list": [...]}


if __name__ == "__main__":
    brawlers = fetch_all_brawlers()
    out_path = RAW_DIR / "brawlstars_brawlers_raw.json"
    out_path.write_text(json.dumps(brawlers, indent=2))
    print(f"Wrote {len(brawlers)} raw records to {out_path}")