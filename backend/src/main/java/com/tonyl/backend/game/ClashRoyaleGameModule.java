package com.tonyl.backend.game;

import com.tonyl.backend.domain.GridItem;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

public class ClashRoyaleGameModule implements GameModule {

    @Override
    public String getGameId() {
        return "clashroyale";
    }

    @Override
    public List<CategoryDefinition> getCategoryDefinitions(List<GridItem> entities) {
        List<CategoryDefinition> categories = new ArrayList<>();
        categories.addAll(categoriesForAttribute(entities, "rarity"));
        categories.addAll(categoriesForAttribute(entities, "card_type"));
        categories.addAll(categoriesForAttribute(entities, "elixir_cost"));
        categories.addAll(categoriesForAttribute(entities, "form"));
        return categories;
    }

    private List<CategoryDefinition> categoriesForAttribute(List<GridItem> entities, String attributeKey) {
        Set<Object> distinctValues = entities.stream()
            .map(e -> e.getAttributes().get(attributeKey))
            .filter(Objects::nonNull)  // excludes Mirror's null elixir_cost
            .collect(Collectors.toSet());

        return distinctValues.stream()
            .map(value -> (CategoryDefinition) new AttributeEqualsCategory(
                String.valueOf(value), attributeKey, value))
            .toList();
    }
}
