package com.tonyl.backend.game;

import com.tonyl.backend.domain.GridItem;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

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
}