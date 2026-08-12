package com.tonyl.backend.game;

import com.tonyl.backend.domain.GridItem;

public interface CategoryDefinition {
    String getId();       // stable identifier, e.g. "element:Pyro"
    String getLabel();    // display label, e.g. "Pyro"
    String getDimension(); // which attribute this category is drawn from, e.g. "rarity" 
    boolean matches(GridItem item);
}