package com.tonyl.backend.game;

import com.tonyl.backend.domain.GridItem;

import java.util.List;

public interface GameModule {
    String getGameId();

    /**
     * Generate the full set of possible categories for this game, derived
     * from the actual entity data (not hardcoded) so new characters/cards
     * automatically produce new category options without code changes.
     */
    List<CategoryDefinition> getCategoryDefinitions(List<GridItem> entities);
}