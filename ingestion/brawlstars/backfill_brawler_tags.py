# Hand-curated brawler tag data - non-mutually-exclusive flags that don't
# fit the rarity/brawler_class/traits attributes (traits is reserved for
# in-game passive-ability mechanics, see backfill_brawler_traits.py; do not
# mix tag values into it). The Brawl Stars API exposes none of this, so this
# is the sole source of truth - applied in normalize.py's map_brawler for
# every brawler, defaulting to [] for brawlers with no tags. Keep in sync by
# hand as Supercell changes brawlers. A brawler can carry more than one tag
# (e.g. Pearl is both Former Chromatic and Has Wallbreak) - that's the whole
# point of modeling this as a list rather than a single-valued attribute
# like rarity. Sorted alphabetically by brawler name (unlike
# backfill_brawler_traits.py's group-by-value layout) since every brawler
# here can carry any combination of the four tags below, so there's no
# single grouping that stays clean.
KNOWN_TAGS: dict[str, list[str]] = {
    "8-Bit": ["Has Legendary Skin"],
    "Amber": ["Has Legendary Skin"],
    "Ash": ["Former Chromatic"],
    "Belle": ["Former Chromatic"],
    "Bibi": ["Has Legendary Skin"],
    "Bo": ["Has Wallbreak", "Has Legendary Skin"],
    "Brock": ["Has Wallbreak"],
    "Bull": ["Has Wallbreak"],
    "Buster": ["Former Chromatic"],
    "Buzz": ["Former Chromatic", "Has Hypercharge Skin"],
    "Charlie": ["Former Chromatic", "Has Legendary Skin"],
    "Chester": ["Has Wallbreak"],
    "Chuck": ["Has Legendary Skin"],
    "Colette": ["Former Chromatic"],
    "Colt": ["Has Wallbreak", "Has Legendary Skin"],
    "Cordelius": ["Former Chromatic", "Has Legendary Skin"],
    "Crow": ["Has Legendary Skin"],
    "Draco": ["Has Legendary Skin"],
    "Dynamike": ["Has Wallbreak", "Has Legendary Skin"],
    "Edgar": ["Has Hypercharge Skin", "Has Legendary Skin"],
    "El Primo": ["Has Wallbreak", "Has Legendary Skin"],
    "Eve": ["Former Chromatic"],
    "Fang": ["Former Chromatic"],
    "Finx": ["Has Legendary Skin"],
    "Frank": ["Has Wallbreak", "Has Legendary Skin"],
    "Gale": ["Former Chromatic"],
    "Gene": ["Has Wallbreak"],
    "Gray": ["Has Wallbreak", "Has Legendary Skin"],
    "Griff": ["Has Wallbreak"],
    "Grom": ["Has Wallbreak", "Has Legendary Skin"],
    "Janet": ["Former Chromatic"],
    "Jessie": ["Has Legendary Skin"],
    "Kaze": ["Has Legendary Skin"],
    "Kenji": ["Has Hypercharge Skin", "Has Legendary Skin"],
    "Larry & Lawrie": ["Has Legendary Skin"],
    "Leon": ["Has Legendary Skin"],
    "Lola": ["Former Chromatic"],
    "Lou": ["Former Chromatic", "Has Legendary Skin"],
    "Maisie": ["Former Chromatic"],
    "Mandy": ["Former Chromatic"],
    "Meg": ["Has Hypercharge Skin"],
    "Mico": ["Has Legendary Skin"],
    "Moe": ["Has Wallbreak"],
    "Mortis": ["Has Hypercharge Skin", "Has Legendary Skin"],
    "Nani": ["Has Wallbreak"],
    "Nita": ["Has Hypercharge Skin", "Has Legendary Skin"],
    "Otis": ["Former Chromatic"],
    "Pam": ["Has Legendary Skin"],
    "Pearl": ["Former Chromatic", "Has Wallbreak"],
    "Piper": ["Has Wallbreak", "Has Hypercharge Skin"],
    "Poco": ["Has Hypercharge Skin"],
    "R-T": ["Former Chromatic"],
    "Rico": ["Has Hypercharge Skin"],
    "Ruffs": ["Former Chromatic", "Has Wallbreak"],
    "Sam": ["Former Chromatic"],
    "Sandy": ["Has Legendary Skin"],
    "Shade": ["Has Legendary Skin"],
    "Shelly": ["Has Wallbreak", "Has Legendary Skin"],
    "Spike": ["Has Legendary Skin"],
    "Stu": ["Has Wallbreak", "Has Legendary Skin"],
    "Surge": ["Former Chromatic", "Has Legendary Skin"],
    "Tara": ["Has Wallbreak"],
    "Tick": ["Has Wallbreak", "Has Legendary Skin"],
}
