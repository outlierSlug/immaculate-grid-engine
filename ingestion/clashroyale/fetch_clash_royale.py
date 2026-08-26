"""
https://developer.clashroyale.com/ (official API), accessed via the
RoyaleAPI proxy (https://docs.royaleapi.com/proxy.html) so the API key can
whitelist a fixed IP (45.79.218.79) instead of a dynamic home/dev IP.

Requires a CLASH_ROYALE_API_TOKEN in a local .env file (see .env.example) -
never commit the real token.
"""
import json
from pathlib import Path

import requests
from dotenv import load_dotenv
import os

load_dotenv(Path(__file__).parent / ".env")

RAW_DIR = Path(__file__).parent / "raw"
RAW_DIR.mkdir(exist_ok=True)

BASE_URL = "https://proxy.royaleapi.dev/v1"


def fetch_all_cards() -> list[dict]:
    token = os.environ["CLASH_ROYALE_API_TOKEN"]
    resp = requests.get(
        f"{BASE_URL}/cards",
        headers={"Authorization": f"Bearer {token}"},
    )
    resp.raise_for_status()
    data = resp.json()
    return data["items"]  # response is wrapped in {"items": [...]}


if __name__ == "__main__":
    cards = fetch_all_cards()
    out_path = RAW_DIR / "clashroyale_cards_raw.json"
    out_path.write_text(json.dumps(cards, indent=2))
    print(f"Wrote {len(cards)} raw records to {out_path}")
