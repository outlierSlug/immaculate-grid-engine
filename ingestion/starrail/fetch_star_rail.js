// Recon run: dump everything getAllCharacters() actually gives us so we
// can decide what's usable before writing a real normalize step (see
// sibling games' fetch_*.py for the pattern this will eventually match -
// this file only exists because starrail.js is Node-only, unlike every
// other game's fetch script).
const { StarRail } = require("starrail.js");
const fs = require("fs");
const path = require("path");

async function main() {
  const client = new StarRail({ cacheDirectory: path.join(__dirname, "cache") });

  console.log("Downloading/updating game data cache (this can take a bit on first run)...");
  await client.cachedAssetsManager.fetchAllContents();

  const characters = client.getAllCharacters();
  console.log(`getAllCharacters() returned ${characters.length} total.`);

  const playable = client.getAllCharacters(true);
  console.log(`getAllCharacters(true) (playableOnly) returned ${playable.length}.`);

  // Dump one full character raw so we can see EVERY field, not just the
  // ones we already expect (path/combatType/stars) - image assets in
  // particular need their .url resolved explicitly since it's a getter,
  // not an own-enumerable property JSON.stringify would pick up for free.
  function serializeImage(img) {
    if (!img) return null;
    try {
      return { url: img.url, path: img.path };
    } catch (e) {
      return { error: String(e) };
    }
  }

  function serializeCharacter(c) {
    return {
      id: c.id,
      enhancedId: c.enhancedId ?? null,
      name: c.name?.get ? c.name.get("en") : c.name,
      path: c.path ? { id: c.path.id, text: c.path.text?.get ? c.path.text.get("en") : c.path.text } : null,
      combatType: c.combatType ? { id: c.combatType.id, text: c.combatType.text?.get ? c.combatType.text.get("en") : c.combatType.text } : null,
      stars: c.stars,
      maxEnergy: c.maxEnergy,
      icon: serializeImage(c.icon),
      miniIcon: serializeImage(c.miniIcon),
      sideIcon: serializeImage(c.sideIcon),
      splashImage: serializeImage(c.splashImage),
      // Everything else, so nothing gets silently missed - own-enumerable
      // keys only (methods/getters on the prototype won't show here,
      // that's what the explicit fields above are for).
      _ownKeys: Object.keys(c),
    };
  }

  const allSerialized = characters.map(serializeCharacter);

  const outDir = path.join(__dirname, "raw");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "star_rail_characters_raw.json"),
    JSON.stringify(allSerialized, null, 2)
  );
  console.log(`Wrote ${allSerialized.length} characters to raw/star_rail_characters_raw.json`);

  // Print a few full examples to stdout too, including at least one
  // Trailblazer variant if present, since that's the multi-form case we
  // actually need to understand.
  const trailblazers = allSerialized.filter(c => /trailblazer/i.test(c.name || ""));
  console.log("\n--- Sample: first 2 characters ---");
  console.log(JSON.stringify(allSerialized.slice(0, 2), null, 2));
  console.log("\n--- Trailblazer variants found:", trailblazers.length, "---");
  console.log(JSON.stringify(trailblazers, null, 2));

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
