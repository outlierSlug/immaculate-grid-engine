package com.tonyl.backend.game;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

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

    // passive_talent's two thinnest values (Mora Cost Reduction: 2 members,
    // Stellar Jubilee: 4 members) sit on either side of this floor -
    // deliberately the same value/reasoning as ASCENSION_MATERIAL_MIN_COUNT
    // above (near-unique answers are a generation hazard, not just weak
    // trivia), not a coincidence. See
    // ingestion/genshin/raw/passive_talent_definitive_plan.txt for the full
    // category design.
    private static final int PASSIVE_TALENT_MIN_COUNT = 3;

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

    // passive_talent started at the default 1.0 and measured in line with
    // the other core dimensions (11.0% of category slots vs. rarity's 12.0%,
    // release_era's 8.9% - see reportsDimensionDistributionAcrossManyGenerations),
    // but that measured how OFTEN it appears, not how HARD it is to solve -
    // unlike element/weapon/region, recognizing a character's Utility Passive
    // classification requires deep, specific game knowledge most players
    // won't have memorized. Tried 0.3 (ASCENSION_WEIGHT's own value, 4.3%
    // share - the same "genuinely obscure trivia" class as the ascension
    // dimensions) and 0.2 (3.1% share) - settled back on 0.3. Note weight
    // only controls how OFTEN this dimension is picked, not how thin its
    // cells are once picked (see perDimensionCellDepthReport -
    // passive_talent's own cell depth was never actually the outlier among
    // Genshin's dimensions) - re-measure after changing and adjust further.
    private static final double PASSIVE_TALENT_WEIGHT = 0.3;

    // release_era and release_version are both patch-based (the same
    // underlying timeline at different granularity) and both are among the
    // healthier dimensions by cell depth (see perDimensionCellDepthReport -
    // release_era's mean depth 5.13/11.9% single-answer is better than
    // element/weapon/model; release_version's 3.48/34.5% is thinner but
    // still nowhere near boss_material's 53.8%), so this isn't the same
    // "genuinely obscure/thin" suppression ASCENSION_WEIGHT applies to the
    // ascension dimensions - just a shared, modest trim off their shares so
    // the two don't compete at full default weight against each other and
    // the more central dimensions. Re-measure after changing and adjust.
    private static final double VERSION_DIMENSION_WEIGHT = 0.7;

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
        categories.addAll(categoriesForAttribute(entities, "release_version", RELEASE_VERSION_MIN_COUNT, VERSION_DIMENSION_WEIGHT));
        categories.addAll(categoriesForAttribute(entities, "release_era", 1, VERSION_DIMENSION_WEIGHT));
        // Ascension-related dimensions - see ingestion/genshin/README.md's
        // ascension pipeline section. The elemental gemstone is
        // deliberately not here (1:1 with element, already covered above).
        categories.addAll(categoriesForAttribute(entities, "local_specialty", ASCENSION_MATERIAL_MIN_COUNT, ASCENSION_WEIGHT));
        categories.addAll(categoriesForAttribute(entities, "common_material", 1, ASCENSION_WEIGHT));
        categories.addAll(categoriesForAttribute(entities, "boss_material", ASCENSION_MATERIAL_MIN_COUNT, ASCENSION_WEIGHT));
        categories.addAll(categoriesForAttribute(entities, "ascension_stat", 1, ASCENSION_WEIGHT));
        // Multi-valued - see ingestion/genshin/raw/passive_talent_definitive_plan.txt.
        categories.addAll(categoriesForListAttribute(entities, "passive_talent", PASSIVE_TALENT_MIN_COUNT, PASSIVE_TALENT_WEIGHT));
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

    // Like categoriesForAttribute, but for a multi-valued attribute (a
    // character may belong to none, one, or several passive_talent
    // categories) - flattens each entity's value list instead of reading a
    // single scalar, and builds AttributeContainsCategory (list-membership)
    // rather than AttributeEqualsCategory (equality). Mirrors Brawl Stars'
    // own categoriesForListAttribute, but with the same minCount/weight
    // support this class's categoriesForAttribute has (Brawl Stars' doesn't
    // need it - none of its list attributes are thin enough to warrant a
    // floor).
    private List<CategoryDefinition> categoriesForListAttribute(
        List<GridItem> entities, String attributeKey, int minCount, double weight
    ) {
        Map<String, Long> counts = entities.stream()
            .flatMap(e -> {
                Object raw = e.getAttributes().get(attributeKey);
                return raw instanceof Collection<?> values ? values.stream() : Stream.empty();
            })
            .map(String::valueOf)
            .collect(Collectors.groupingBy(v -> v, Collectors.counting()));

        return counts.entrySet().stream()
            .filter(e -> e.getValue() >= minCount)
            .map(e -> (CategoryDefinition) new AttributeContainsCategory(
                e.getKey(), attributeKey, e.getKey(), weight))
            .toList();
    }

    private String labelFor(String attributeKey, Object value) {
        if (attributeKey.equals("rarity")) {
            return value + "-Star";
        }
        return String.valueOf(value);
    }
}
