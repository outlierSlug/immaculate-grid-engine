import json
import re
from pathlib import Path

from schema import validate_entities

# ── Paths ────────────────────────────────────────────────
RAW_PATH = Path(__file__).parent / "raw" / "genshin_characters.json"
OUTPUT_PATH = Path(__file__).parent / "output" / "genshin_entities.json"

# ── Enka icon mapping ────────────────────────────────────
ENKA_ICON_MAP = {
    "Aino": "UI_AvatarIcon_Aino",
    "Albedo": "UI_AvatarIcon_Albedo",
    "Alhaitham": "UI_AvatarIcon_Alhatham",
    "Aloy": "UI_AvatarIcon_Aloy",
    "Alyosha": "UI_AvatarIcon_Alyosha",
    "Amber": "UI_AvatarIcon_Ambor",
    "Arataki Itto": "UI_AvatarIcon_Itto",
    "Arlecchino": "UI_AvatarIcon_Arlecchino",
    "Baizhu": "UI_AvatarIcon_Baizhuer",
    "Barbara": "UI_AvatarIcon_Barbara",
    "Beidou": "UI_AvatarIcon_Beidou",
    "Bennett": "UI_AvatarIcon_Bennett",
    "Candace": "UI_AvatarIcon_Candace",
    "Charlotte": "UI_AvatarIcon_Charlotte",
    "Chasca": "UI_AvatarIcon_Chasca",
    "Chevreuse": "UI_AvatarIcon_Chevreuse",
    "Chiori": "UI_AvatarIcon_Chiori",
    "Chongyun": "UI_AvatarIcon_Chongyun",
    "Citlali": "UI_AvatarIcon_Citlali",
    "Clorinde": "UI_AvatarIcon_Clorinde",
    "Collei": "UI_AvatarIcon_Collei",
    "Columbina": "UI_AvatarIcon_Columbina",
    "Cyno": "UI_AvatarIcon_Cyno",
    "Dahlia": "UI_AvatarIcon_Dahlia",
    "Dehya": "UI_AvatarIcon_Dehya",
    "Diluc": "UI_AvatarIcon_Diluc",
    "Diona": "UI_AvatarIcon_Diona",
    "Dori": "UI_AvatarIcon_Dori",
    "Durin": "UI_AvatarIcon_Durin",
    "Emilie": "UI_AvatarIcon_Emilie",
    "Escoffier": "UI_AvatarIcon_Escoffier",
    "Eula": "UI_AvatarIcon_Eula",
    "Faruzan": "UI_AvatarIcon_Faruzan",
    "Fischl": "UI_AvatarIcon_Fischl",
    "Flins": "UI_AvatarIcon_Flins",
    "Freminet": "UI_AvatarIcon_Freminet",
    "Furina": "UI_AvatarIcon_Furina",
    "Gaming": "UI_AvatarIcon_Gaming",
    "Ganyu": "UI_AvatarIcon_Ganyu",
    "Gorou": "UI_AvatarIcon_Gorou",
    "Hu Tao": "UI_AvatarIcon_Hutao",
    "Iansan": "UI_AvatarIcon_Iansan",
    "Ifa": "UI_AvatarIcon_Ifa",
    "Illuga": "UI_AvatarIcon_Illuga",
    "Ineffa": "UI_AvatarIcon_Ineffa",
    "Jahoda": "UI_AvatarIcon_Jahoda",
    "Jean": "UI_AvatarIcon_Qin",
    "Kachina": "UI_AvatarIcon_Kachina",
    "Kaedehara Kazuha": "UI_AvatarIcon_Kazuha",
    "Kaeya": "UI_AvatarIcon_Kaeya",
    "Kamisato Ayaka": "UI_AvatarIcon_Ayaka",
    "Kamisato Ayato": "UI_AvatarIcon_Ayato",
    "Kaveh": "UI_AvatarIcon_Kaveh",
    "Keqing": "UI_AvatarIcon_Keqing",
    "Kinich": "UI_AvatarIcon_Kinich",
    "Kirara": "UI_AvatarIcon_Momoka",
    "Klee": "UI_AvatarIcon_Klee",
    "Kujou Sara": "UI_AvatarIcon_Sara",
    "Kuki Shinobu": "UI_AvatarIcon_Shinobu",
    "Lan Yan": "UI_AvatarIcon_Lanyan",
    "Lauma": "UI_AvatarIcon_Lauma",
    "Layla": "UI_AvatarIcon_Layla",
    "Linnea": "UI_AvatarIcon_Linnea",
    "Lisa": "UI_AvatarIcon_Lisa",
    "Lohen": "UI_AvatarIcon_Lohen",
    "Lynette": "UI_AvatarIcon_Linette",
    "Lyney": "UI_AvatarIcon_Liney",
    "Mavuika": "UI_AvatarIcon_Mavuika",
    "Mika": "UI_AvatarIcon_Mika",
    "Mona": "UI_AvatarIcon_Mona",
    "Mualani": "UI_AvatarIcon_Mualani",
    "Nahida": "UI_AvatarIcon_Nahida",
    "Navia": "UI_AvatarIcon_Navia",
    "Nefer": "UI_AvatarIcon_Nefer",
    "Neuvillette": "UI_AvatarIcon_Neuvillette",
    "Nicole": "UI_AvatarIcon_Nicole",
    "Nilou": "UI_AvatarIcon_Nilou",
    "Ningguang": "UI_AvatarIcon_Ningguang",
    "Noelle": "UI_AvatarIcon_Noel",
    "Odette": "UI_AvatarIcon_Odette",
    "Ororon": "UI_AvatarIcon_Olorun",
    "Prune": "UI_AvatarIcon_Prune",
    "Qiqi": "UI_AvatarIcon_Qiqi",
    "Raiden Shogun": "UI_AvatarIcon_Shougun",
    "Razor": "UI_AvatarIcon_Razor",
    "Rosaria": "UI_AvatarIcon_Rosaria",
    "Sandrone": "UI_AvatarIcon_MarionetteNew",
    "Sangonomiya Kokomi": "UI_AvatarIcon_Kokomi",
    "Sayu": "UI_AvatarIcon_Sayu",
    "Sethos": "UI_AvatarIcon_Sethos",
    "Shenhe": "UI_AvatarIcon_Shenhe",
    "Shikanoin Heizou": "UI_AvatarIcon_Heizo",
    "Sigewinne": "UI_AvatarIcon_Sigewinne",
    "Skirk": "UI_AvatarIcon_SkirkNew",
    "Sucrose": "UI_AvatarIcon_Sucrose",
    "Tartaglia": "UI_AvatarIcon_Tartaglia",
    "Thoma": "UI_AvatarIcon_Tohma",
    "Tighnari": "UI_AvatarIcon_Tighnari",
    "Traveler": "UI_AvatarIcon_PlayerBoy",
    "Varesa": "UI_AvatarIcon_Varesa",
    "Varka": "UI_AvatarIcon_Varka",
    "Venti": "UI_AvatarIcon_Venti",
    "Wanderer": "UI_AvatarIcon_Wanderer",
    "Wriothesley": "UI_AvatarIcon_Wriothesley",
    "Xiangling": "UI_AvatarIcon_Xiangling",
    "Xianyun": "UI_AvatarIcon_Liuyun",
    "Xiao": "UI_AvatarIcon_Xiao",
    "Xilonen": "UI_AvatarIcon_Xilonen",
    "Xingqiu": "UI_AvatarIcon_Xingqiu",
    "Xinyan": "UI_AvatarIcon_Xinyan",
    "Yae Miko": "UI_AvatarIcon_Yae",
    "Yanfei": "UI_AvatarIcon_Feiyan",
    "Yaoyao": "UI_AvatarIcon_Yaoyao",
    "Yelan": "UI_AvatarIcon_Yelan",
    "Yoimiya": "UI_AvatarIcon_Yoimiya",
    "Yumemizuki Mizuki": "UI_AvatarIcon_Mizuki",
    "Yun Jin": "UI_AvatarIcon_Yunjin",
    "Zhongli": "UI_AvatarIcon_Zhongli",
    "Zibai": "UI_AvatarIcon_Zibai",
}

TRAVELER_ELEMENTS = ["Anemo", "Geo", "Electro", "Dendro", "Hydro", "Pyro", "Cryo"]

TRAVELER_GENDERS = [
    ("aether", "Aether", "Medium Male", "UI_AvatarIcon_PlayerBoy"),
    ("lumine", "Lumine", "Medium Female", "UI_AvatarIcon_PlayerGirl"),
]


def slugify(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s)
    return s


def get_image_url(name: str) -> str:
    icon = ENKA_ICON_MAP.get(name)
    if icon:
        return f"https://enka.network/ui/{icon}.png"
    # Fallback for characters not yet in Enka
    return f"https://genshin-impact.fandom.com/wiki/Special:FilePath/{name.replace(' ', '_')}_Icon.png"


def map_character(raw: dict) -> list[dict]:
    name = raw["name"]

    if name == "Wonderland Manekin":
        return []

    if name == "Traveler":
        entities = []
        
        for gender_id, gender_name, model, icon in TRAVELER_GENDERS:
            for element in TRAVELER_ELEMENTS:
                entities.append({
                    "id": f"traveler-{gender_id}-{element.lower()}",
                    "game_id": "genshin",
                    "display_name": f"Traveler – {gender_name} ({element}) ",
                    "image_url": f"https://enka.network/ui/{icon}.png",
                    "attributes": {
                        "element": element,
                        "weapon": "Sword",
                        "rarity": 5,
                        "region": "",
                        "model": model,
                        "release_date": raw.get("release_date") or "2020-09-28",
                        "release_version": raw.get("release_version") or "1.0",
                    },
                })
        return entities

    # ── Normal characters ────────────────────────────────
    return [{
        "id": slugify(name),
        "game_id": "genshin",
        "display_name": name,
        "image_url": get_image_url(name),
        "attributes": {
            "element": raw.get("element") or "",
            "weapon": raw.get("weapon") or "",
            "rarity": raw.get("rarity"),
            "region": raw.get("region") or "",
            "model": raw.get("model") or "",
            "release_date": raw.get("release_date") or "",
            "release_version": raw.get("release_version") or "",
        },
    }]


def main():
    raw_records = json.loads(RAW_PATH.read_text(encoding="utf-8"))

    mapped = []
    for r in raw_records:
        mapped.extend(map_character(r))

    validated = validate_entities(mapped)

    OUTPUT_PATH.parent.mkdir(exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps([e.model_dump() for e in validated], indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Wrote {len(validated)} validated entities to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()