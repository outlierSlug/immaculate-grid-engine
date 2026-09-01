package com.tonyl.backend.game;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import com.tonyl.backend.domain.GridItem;

public class GenshinGameModule implements GameModule {

    // local_specialty/boss_material specifically (not common_material or
    // ascension_stat, which are already healthy - see
    // ingestion/genshin/README.md) run heavily long-tailed: most of their
    // 59/47 raw values are shared by just 1-2 characters. Below this
    // floor, a value is both bad trivia (nobody recognizes a material one
    // character uses) and a generation hazard - a near-unique answer is
    // often the ONLY valid answer for a cell, which collides across cells
    // and fails GridGenerator's soft-lock-guard perfect-matching check.
    // Measured directly against the real running backend: with the full
    // 59/47 raw values, a plain Unlimited generation request succeeded
    // ~33% of the time; this floor alone restored 100% across 30
    // consecutive live requests, and PuzzleServiceGenerationTest (which
    // simulates what a player actually experiences, retry+exhaustive-
    // fallback included) shows 0/1000 simulated Daily failures at this
    // floor. Counted at the GridItem level (what this method actually
    // groups by - 132 entities, not 119 "characters"), local_specialty's
    // richest value is "Windwheel Aster" at 16, inflated almost entirely
    // by Traveler's 14 element/gender variants sharing one ascension
    // record (see TRAVELER_ASCENSION's own comment in normalize_genshin.py)
    // plus 2 real characters - so 3 isn't a hard ceiling forced by the
    // data, but raising it further is still the wrong move: at floor=5,
    // every other local_specialty value drops out and "Windwheel Aster"
    // becomes the ONLY option, which collapses local_specialty from 12
    // genuinely distinct values down to one Traveler-dominated one - a
    // worse outcome for puzzle variety than simply having fewer thin
    // values. See GridGeneratorTest's own genshin floor comment for why
    // its raw (no-retry) single-seed reliability is still lower than the
    // other 3 games' even at this floor.
    private static final int ASCENSION_MATERIAL_MIN_COUNT = 3;

    // release_version's raw per-patch values are similarly thin (51
    // distinct values, most held by just 1-2 characters - see
    // ingestion/genshin/output/genshin_attribute_counts.txt) - the same
    // near-unique-answer generation hazard as ASCENSION_MATERIAL_MIN_COUNT
    // above. Those characters aren't dropped from the puzzle pool, though -
    // release_era (a derived bucketing of release_version into "Version N
    // (N.x)" - see normalize_genshin.py's release_era()) covers everyone at
    // a coarser, healthier granularity (~7 buckets, all with 15+ members
    // except the newest patch, which will only grow over time).
    private static final int RELEASE_VERSION_MIN_COUNT = 3;

    // How often a category should be picked once its dimension is already in
    // a row/col pool, relative to the default of 1.0 - see CategoryDefinition
    // .getWeight()'s own doc comment for the mechanism (GridGenerator applies
    // this completely generically; it has no idea "ascension" or "genshin"
    // exist). Chosen from a live measurement of 300 real generations at
    // weight 1.0 everywhere: rarity and region came out under-represented
    // (8.6%/10.7% of all category slots, against weapon/model's ~19% each)
    // despite being core, easily-recognized categories, while common_material
    // and ascension_stat - genuinely obscure to anyone who hasn't
    // memorized ascension material tables - matched region's own rate
    // (9.9%/9.6%) with no natural suppression at all (unlike local_specialty/
    // boss_material, whose thinness already gets them rejected by the
    // soft-lock guard often enough to suppress them on its own - see
    // ASCENSION_MATERIAL_MIN_COUNT's own comment). These two multipliers are
    // a starting point, not a final answer - re-measure after changing
    // either and adjust, the same way the min-count floor above was tuned
    // against real data rather than picked once and left alone.
    private static final double BOOSTED_WEIGHT = 2.0;
    private static final double ASCENSION_WEIGHT = 0.3;

    @Override
    public String getGameId() {
        return "genshin";
    }

    @Override
    public List<CategoryDefinition> getCategoryDefinitions(List<GridItem> entities) {
        List<CategoryDefinition> categories = new ArrayList<>();
        categories.addAll(categoriesForAttribute(entities, "element", 1, 1.0));
        categories.addAll(categoriesForAttribute(entities, "weapon", 1, 1.0));
        categories.addAll(categoriesForAttribute(entities, "region", 1, BOOSTED_WEIGHT));
        categories.addAll(categoriesForAttribute(entities, "rarity", 1, BOOSTED_WEIGHT));
        categories.addAll(categoriesForAttribute(entities, "model", 1, 1.0));
        categories.addAll(categoriesForAttribute(entities, "release_version", RELEASE_VERSION_MIN_COUNT, 1.0));
        categories.addAll(categoriesForAttribute(entities, "release_era", 1, 1.0));
        // Ascension-related dimensions - see ingestion/genshin/README.md's
        // ascension pipeline section. The elemental gemstone is
        // deliberately not here (1:1 with element, already covered above).
        categories.addAll(categoriesForAttribute(entities, "local_specialty", ASCENSION_MATERIAL_MIN_COUNT, ASCENSION_WEIGHT));
        categories.addAll(categoriesForAttribute(entities, "common_material", 1, ASCENSION_WEIGHT));
        categories.addAll(categoriesForAttribute(entities, "boss_material", ASCENSION_MATERIAL_MIN_COUNT, ASCENSION_WEIGHT));
        categories.addAll(categoriesForAttribute(entities, "ascension_stat", 1, ASCENSION_WEIGHT));
        return categories;
    }

    private List<CategoryDefinition> categoriesForAttribute(
        List<GridItem> entities, String attributeKey, int minCount, double weight
    ) {
        Map<Object, Long> counts = entities.stream()
            .map(e -> e.getAttributes().get(attributeKey))
            .filter(Objects::nonNull)
            .filter(v -> !(v instanceof String s && s.isBlank()))
            .collect(Collectors.groupingBy(v -> v, Collectors.counting()));

        return counts.entrySet().stream()
            .filter(e -> e.getValue() >= minCount)
            .map(e -> (CategoryDefinition) new AttributeEqualsCategory(
                labelFor(attributeKey, e.getKey()), attributeKey, e.getKey(), weight))
            .toList();
    }

    private String labelFor(String attributeKey, Object value) {
        if (attributeKey.equals("rarity")) {
            return value + "-Star";
        }
        return String.valueOf(value);
    }
}
