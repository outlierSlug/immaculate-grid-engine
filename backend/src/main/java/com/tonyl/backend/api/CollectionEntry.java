package com.tonyl.backend.api;

import java.time.LocalDate;
import java.util.List;

// One collected character/card - game-agnostic on purpose: the backend only
// reports which live Daily puzzles (by date, ascending) an item was a
// correct answer in. What that means (Genshin constellations - the first
// date is C0, the second C1, and so on - Star Rail eidolons, or nothing
// beyond "collected" for Brawl Stars/Clash Royale) is frontend config, not
// something this API knows about.
public record CollectionEntry(String itemId, int timesCollected, List<LocalDate> collectedDates) {}
