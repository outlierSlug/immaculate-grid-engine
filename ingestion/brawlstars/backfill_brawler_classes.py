# Hand-curated brawler_class overrides for brawlers the Brawl Stars API
# reports as class.name == "Unknown". Applied in normalize.py's map_brawler
# whenever the raw class comes back Unknown, so this stays correct across
# re-fetches until Supercell's API itself classifies these brawlers.
KNOWN_CLASSES = {
    "Wendy": "Support",
    "Nori": "Assassin",
    "Bolt": "Tank",
    "Starr Nova": "Assassin",
    "Damian": "Tank",
    "Najia": "Damage Dealer",
    "Sirius": "Controller",
    "Glowy": "Support",
    "Gigi": "Assassin",
    "Pierce": "Marksman",
    "Ziggy": "Controller",
    "Mina": "Damage Dealer",
    "Trunk": "Tank",
    "Alli": "Assassin",
    "Kaze": "Assassin",
    "Jae-Yong": "Support",
    "Finx": "Controller",
    "Ollie": "Tank",
    "Meeple": "Controller",
}