package com.tonyl.backend.game;

import com.tonyl.backend.domain.GridItem;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class StarRailGameModule implements GameModule {

    // affiliation's thinnest included values (Galaxy Rangers/Masked Fools,
    // both exactly 3 members) sit right at this floor - below it, six
    // single-member factions (Astropolis, Self-Annihilators, Knights of
    // Beauty, Garden of Recollection, Intelligentsia Guild, The Cremators)
    // would surface as a category with exactly one valid answer, a giveaway
    // rather than a puzzle constraint - same reasoning/value as Genshin's
    // ASCENSION_MATERIAL_MIN_COUNT/PASSIVE_TALENT_MIN_COUNT. See
    // ingestion/starrail/raw/affiliation_definitive_plan.txt for the full
    // membership list, including the six excluded factions (still attached
    // to their characters' data, just never eligible to become a category).
    private static final int AFFILIATION_MIN_COUNT = 3;

    // Starting point at the engine default - re-measure against real
    // generations and adjust the way Genshin's PASSIVE_TALENT_WEIGHT was
    // tuned (see that constant's own comment in GenshinGameModule) once
    // this is live.
    private static final double AFFILIATION_WEIGHT = 1.0;

    @Override
    public String getGameId() {
        return "starrail";
    }

    @Override
    public List<CategoryDefinition> getCategoryDefinitions(List<GridItem> entities) {
        List<CategoryDefinition> categories = new ArrayList<>();
        categories.addAll(categoriesForAttribute(entities, "rarity"));
        categories.addAll(categoriesForAttribute(entities, "path"));
        categories.addAll(categoriesForAttribute(entities, "element"));
        // Multi-valued - see ingestion/starrail/raw/affiliation_definitive_plan.txt.
        categories.addAll(categoriesForListAttribute(entities, "affiliation", AFFILIATION_MIN_COUNT, AFFILIATION_WEIGHT));
        return categories;
    }

    private List<CategoryDefinition> categoriesForAttribute(List<GridItem> entities, String attributeKey) {
        Set<Object> distinctValues = entities.stream()
            .map(e -> e.getAttributes().get(attributeKey))
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());

        return distinctValues.stream()
            .map(value -> (CategoryDefinition) new AttributeEqualsCategory(
                labelFor(attributeKey, value), attributeKey, value))
            .toList();
    }

    // Like categoriesForAttribute, but for a multi-valued attribute (a
    // character may hold zero, one, or several affiliations) - mirrors
    // GenshinGameModule's own categoriesForListAttribute exactly: flattens
    // each entity's value list instead of reading a single scalar, and
    // builds AttributeContainsCategory (list-membership) rather than
    // AttributeEqualsCategory (equality).
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

    // Same "4-Star"/"5-Star" formatting as Genshin's rarity (also a bare
    // int in the data) - reuses the identical CategoryChip treatment
    // (plain-text pill, no dedicated color) rather than inventing a
    // separate convention for what's the same underlying concept.
    private String labelFor(String attributeKey, Object value) {
        if (attributeKey.equals("rarity")) {
            return value + "-Star";
        }
        return String.valueOf(value);
    }
}
