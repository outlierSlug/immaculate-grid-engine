package com.tonyl.backend.game;

import com.tonyl.backend.domain.GridItem;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

public class GenshinGameModule implements GameModule {

    @Override
    public String getGameId() {
        return "genshin";
    }

    @Override
    public List<CategoryDefinition> getCategoryDefinitions(List<GridItem> entities) {
        List<CategoryDefinition> categories = new ArrayList<>();
        categories.addAll(categoriesForAttribute(entities, "element"));
        categories.addAll(categoriesForAttribute(entities, "weapon"));
        categories.addAll(categoriesForAttribute(entities, "region"));
        categories.addAll(categoriesForAttribute(entities, "rarity"));
        categories.addAll(categoriesForAttribute(entities, "model"));
        categories.addAll(categoriesForAttribute(entities, "release_version"));
        return categories;
    }

    private List<CategoryDefinition> categoriesForAttribute(List<GridItem> entities, String attributeKey) {
        Set<Object> distinctValues = entities.stream()
            .map(e -> e.getAttributes().get(attributeKey))
            .filter(Objects::nonNull)
            .filter(v -> !(v instanceof String s && s.isBlank()))
            .collect(Collectors.toSet());

        return distinctValues.stream()
            .map(value -> (CategoryDefinition) new AttributeEqualsCategory(
                labelFor(attributeKey, value), attributeKey, value))
            .toList();
    }

    private String labelFor(String attributeKey, Object value) {
        if (attributeKey.equals("rarity")) {
            return value + "-Star";
        }
        return String.valueOf(value);
    }
}