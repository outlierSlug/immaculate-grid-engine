package com.tonyl.backend.game;

import com.tonyl.backend.domain.GridItem;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class BrawlStarsGameModule implements GameModule {

    @Override
    public String getGameId() {
        return "brawlstars";
    }

    @Override
    public List<CategoryDefinition> getCategoryDefinitions(List<GridItem> entities) {
        List<CategoryDefinition> categories = new ArrayList<>();
        categories.addAll(categoriesForAttribute(entities, "rarity"));
        categories.addAll(categoriesForAttribute(entities, "brawler_class"));
        categories.addAll(categoriesForAttribute(entities, "release_year"));
        categories.addAll(categoriesForListAttribute(entities, "traits"));
        categories.addAll(categoriesForListAttribute(entities, "tags"));
        return categories;
    }

    private List<CategoryDefinition> categoriesForAttribute(List<GridItem> entities, String attributeKey) {
        Set<Object> distinctValues = entities.stream()
            .map(e -> e.getAttributes().get(attributeKey))
            .filter(Objects::nonNull)  // excludes brawlers with null brawler_class
            .collect(Collectors.toSet());

        return distinctValues.stream()
            .map(value -> (CategoryDefinition) new AttributeEqualsCategory(
                String.valueOf(value), attributeKey, value))
            .toList();
    }

    // Traits are multi-valued (a brawler may have none, one, or several), unlike
    // rarity/brawler_class, so this flattens each entity's trait list instead of
    // reading a single scalar per entity, and builds AttributeContainsCategory
    // (list-membership) rather than AttributeEqualsCategory (equality).
    private List<CategoryDefinition> categoriesForListAttribute(List<GridItem> entities, String attributeKey) {
        Set<String> distinctValues = entities.stream()
            .flatMap(e -> {
                Object raw = e.getAttributes().get(attributeKey);
                return raw instanceof Collection<?> values ? values.stream() : Stream.empty();
            })
            .map(String::valueOf)
            .collect(Collectors.toSet());

        return distinctValues.stream()
            .map(value -> (CategoryDefinition) new AttributeContainsCategory(value, attributeKey, value))
            .toList();
    }
}