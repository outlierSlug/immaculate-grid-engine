package com.tonyl.backend.api;

import com.tonyl.backend.domain.GridItem;
import com.tonyl.backend.game.CategoryDefinition;
import com.tonyl.backend.game.GameModule;
import com.tonyl.backend.game.GameModuleRegistry;
import com.tonyl.backend.repository.GridItemRepository;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Exposes the categories a game's GridItems can be grouped by, grouped by
 * dimension, so Unlimited mode's settings panel can build its dimension/value
 * filter UI without hardcoding any per-game knowledge on the frontend.
 */
@RestController
@RequestMapping("/api/games")
public class GameController {

    private final GridItemRepository gridItemRepository;
    private final GameModuleRegistry gameModuleRegistry;

    public GameController(GridItemRepository gridItemRepository, GameModuleRegistry gameModuleRegistry) {
        this.gridItemRepository = gridItemRepository;
        this.gameModuleRegistry = gameModuleRegistry;
    }

    @GetMapping("/{game}/categories")
    public GameCategoriesResponse categories(@PathVariable String game) {
        List<GridItem> entities = gridItemRepository.findByGameId(game);
        GameModule module = gameModuleRegistry.resolve(game);
        List<CategoryDefinition> categories = module.getCategoryDefinitions(entities);

        Map<String, List<CategoryDefinition>> byDimension = categories.stream()
            .collect(Collectors.groupingBy(CategoryDefinition::getDimension, LinkedHashMap::new, Collectors.toList()));

        List<GameCategoriesResponse.DimensionCategories> dimensions = byDimension.entrySet().stream()
            .map(entry -> new GameCategoriesResponse.DimensionCategories(
                entry.getKey(),
                entry.getValue().stream()
                    .map(c -> new GameCategoriesResponse.CategoryOption(c.getId(), c.getLabel()))
                    .sorted(Comparator.comparing(GameCategoriesResponse.CategoryOption::label))
                    .toList()
            ))
            .sorted(Comparator.comparing(GameCategoriesResponse.DimensionCategories::dimension))
            .toList();

        return new GameCategoriesResponse(game, dimensions);
    }
}
