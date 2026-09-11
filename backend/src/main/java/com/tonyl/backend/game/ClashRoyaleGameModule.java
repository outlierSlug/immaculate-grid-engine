package com.tonyl.backend.game;

import com.tonyl.backend.domain.GridItem;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

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
        // Multi-valued - see ingestion/clashroyale/raw/targeting_definitive_plan.txt.
        // No min-count floor needed (unlike Star Rail's affiliation): all
        // three values already have 28+ members.
        categories.addAll(categoriesForListAttribute(entities, "targeting"));
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

    // Like categoriesForAttribute, but for a multi-valued attribute (a card
    // normally holds exactly one targeting value, but a handful of real
    // edge cases hold two) - mirrors StarRailGameModule's own
    // categoriesForListAttribute exactly, minus the minCount/weight params
    // that dimension needed and this one doesn't.
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
