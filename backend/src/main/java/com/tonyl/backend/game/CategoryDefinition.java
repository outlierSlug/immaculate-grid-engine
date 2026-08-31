package com.tonyl.backend.game;

import com.tonyl.backend.domain.GridItem;

public interface CategoryDefinition {
    String getId();       // stable identifier, e.g. "element:Pyro"
    String getLabel();    // display label, e.g. "Pyro"
    String getDimension(); // which attribute this category is drawn from, e.g. "rarity"
    boolean matches(GridItem item);

    // Relative likelihood of being picked once its dimension is already in
    // a row/col pool, consumed generically by GridGenerator.weightedSample -
    // 1.0 (every existing category, every other game) is "no opinion, plain
    // uniform sampling"; >1.0 appears more often, <1.0 less. Purely a
    // GameModule-level concern - GridGenerator never knows which game or
    // which dimension a weight belongs to, only the number itself.
    default double getWeight() {
        return 1.0;
    }
}