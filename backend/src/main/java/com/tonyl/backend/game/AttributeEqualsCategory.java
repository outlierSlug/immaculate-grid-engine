package com.tonyl.backend.game;

import com.tonyl.backend.domain.GridItem;

public class AttributeEqualsCategory implements CategoryDefinition {

    private final String label;
    private final String attributeKey;
    private final Object expectedValue;
    private final double weight;

    public AttributeEqualsCategory(String label, String attributeKey, Object expectedValue) {
        this(label, attributeKey, expectedValue, 1.0);
    }

    public AttributeEqualsCategory(String label, String attributeKey, Object expectedValue, double weight) {
        this.label = label;
        this.attributeKey = attributeKey;
        this.expectedValue = expectedValue;
        this.weight = weight;
    }

    @Override
    public double getWeight() {
        return weight;
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
        // compare as strings - JSONB numeric values can deserialize as
        // Integer or Double depending on the path, so avoid a strict
        // Object.equals() that could false-negative on 5 vs 5.0
        return actual != null && String.valueOf(actual).equals(String.valueOf(expectedValue));
    }
}