package com.tonyl.backend.game;

import com.tonyl.backend.domain.GridItem;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

public class StarRailGameModule implements GameModule {

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
