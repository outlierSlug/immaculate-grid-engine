package com.tonyl.backend.game;

import com.tonyl.backend.domain.GridItem;

import java.util.Collection;

/**
 * Like {@link AttributeEqualsCategory} but for a multi-valued attribute
 * (e.g. a brawler's traits list) - matches when the item's attribute
 * collection contains the expected value, rather than equaling it.
 */
public class AttributeContainsCategory implements CategoryDefinition {

    private final String label;
    private final String attributeKey;
    private final String expectedValue;

    public AttributeContainsCategory(String label, String attributeKey, String expectedValue) {
        this.label = label;
        this.attributeKey = attributeKey;
        this.expectedValue = expectedValue;
    }

    @Override
    public String getId() {
        return attributeKey + ":" + expectedValue;
    }

    @Override
    public String getLabel() {
        return label;
    }

    @Override
    public String getDimension() {
        return attributeKey;
    }

    @Override
    public boolean matches(GridItem item) {
        Object actual = item.getAttributes().get(attributeKey);
        if (!(actual instanceof Collection<?> values)) {
            return false;
        }
        return values.stream().anyMatch(v -> String.valueOf(v).equals(expectedValue));
    }
}
