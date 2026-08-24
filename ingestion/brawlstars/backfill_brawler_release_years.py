# Hand-curated brawler release year - the Brawl Stars API exposes no
# release-date field at all, so this is the sole source of truth. Unlike
# tags (backfill_brawler_tags.py), a brawler has exactly one release year -
# this is a mutually-exclusive scalar attribute (same shape as rarity/
# brawler_class), not a list. Exhaustively covers every released brawler as
# of 2026; keep in sync by hand as Supercell adds new ones.
#
# Edge cases (a brawler's kit/gadgets could ship ahead of their "official"
# unlock, or reach some players before others) are resolved by one rule:
# count from when a brawler was first obtainable by any player for free,
# not from a paywalled early-access window and not from a later "official"
# Starr Road slot:
#   - Edgar: free via Brawlidays Dec 2020, official Starr Road slot was
#     Jan 2021 -> counted as 2020.
#   - Gray: free via a quest Dec 2022, official Starr Road slot was Jan
#     2023 -> counted as 2022.
#   - Mico: free via Brawlidays Dec 2023, official Starr Road slot was Jan
#     2024 -> counted as 2023.
#   - Kit: paid early-access Dec 2023, no free path until the official
#     Starr Road slot Jan 2024 -> counted as 2024 (early access doesn't
#     count; nobody got it for free in 2023).
#   - Pierce: paid early-access Dec 2025, no free path until the official
#     Starr Road slot Jan 2026 -> counted as 2026, same reasoning as Kit.
KNOWN_RELEASE_YEARS: dict[str, int] = {
    # 2017
    "Shelly": 2017,
    "Colt": 2017,
    "Brock": 2017,
    "Jessie": 2017,
    "Nita": 2017,
    "Dynamike": 2017,
    "El Primo": 2017,
    "Bull": 2017,
    "Rico": 2017,
    "Barley": 2017,
    "Poco": 2017,
    "Mortis": 2017,
    "Bo": 2017,
    "Spike": 2017,
    "Crow": 2017,
    "Piper": 2017,
    "Pam": 2017,
    "Tara": 2017,
    "Darryl": 2017,
    # 2018
    "Penny": 2018,
    "Frank": 2018,
    "Leon": 2018,
    # 2019
    "Gene": 2019,
    "Carl": 2019,
    "Rosa": 2019,
    "Bibi": 2019,
    "Tick": 2019,
    "8-Bit": 2019,
    "Sandy": 2019,
    "Emz": 2019,
    "Bea": 2019,
    "Max": 2019,
    # 2020
    "Mr. P": 2020,
    "Jacky": 2020,
    "Sprout": 2020,
    "Gale": 2020,
    "Nani": 2020,
    "Surge": 2020,
    "Colette": 2020,
    "Amber": 2020,
    "Lou": 2020,
    "Byron": 2020,
    "Edgar": 2020,
    # 2021
    "Ruffs": 2021,
    "Stu": 2021,
    "Belle": 2021,
    "Squeak": 2021,
    "Buzz": 2021,
    "Griff": 2021,
    "Ash": 2021,
    "Meg": 2021,
    "Lola": 2021,
    "Grom": 2021,
    # 2022
    "Fang": 2022,
    "Eve": 2022,
    "Janet": 2022,
    "Bonnie": 2022,
    "Otis": 2022,
    "Sam": 2022,
    "Gus": 2022,
    "Buster": 2022,
    "Chester": 2022,
    "Gray": 2022,
    # 2023
    "Mandy": 2023,
    "R-T": 2023,
    "Willow": 2023,
    "Maisie": 2023,
    "Hank": 2023,
    "Cordelius": 2023,
    "Doug": 2023,
    "Pearl": 2023,
    "Chuck": 2023,
    "Charlie": 2023,
    "Mico": 2023,
    # 2024
    "Kit": 2024,
    "Larry & Lawrie": 2024,
    "Angelo": 2024,
    "Melodie": 2024,
    "Lily": 2024,
    "Draco": 2024,
    "Berry": 2024,
    "Clancy": 2024,
    "Moe": 2024,
    "Kenji": 2024,
    "Juju": 2024,
    "Shade": 2024,
    # 2025
    "Meeple": 2025,
    "Ollie": 2025,
    "Finx": 2025,
    "Lumi": 2025,
    "Jae-Yong": 2025,
    "Kaze": 2025,
    "Alli": 2025,
    "Trunk": 2025,
    "Mina": 2025,
    "Ziggy": 2025,
    "Gigi": 2025,
    # 2026
    "Pierce": 2026,
    "Glowy": 2026,
    "Sirius": 2026,
    "Najia": 2026,
    "Damian": 2026,
    "Starr Nova": 2026,
    "Bolt": 2026,
    "Nori": 2026,
    "Wendy": 2026,
}
