package com.tonyl.backend.game;

import com.tonyl.backend.domain.GridItem;

public interface CategoryDefinition {
    String getId();       // stable identifier, e.g. "element:Pyro"
    String getLabel();    // display label, e.g. "Pyro"
    boolean matches(GridItem item);
}