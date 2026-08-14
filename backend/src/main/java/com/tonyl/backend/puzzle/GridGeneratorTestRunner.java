package com.tonyl.backend.puzzle;

import com.tonyl.backend.domain.GridItem;
import com.tonyl.backend.game.CategoryDefinition;
import com.tonyl.backend.game.GenshinGameModule;
import com.tonyl.backend.repository.GridItemRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
@Profile("test-grid")
public class GridGeneratorTestRunner implements CommandLineRunner {

    private final GridItemRepository repository;

    public GridGeneratorTestRunner(GridItemRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        List<GridItem> entities = repository.findByGameId("genshin");
        var module = new GenshinGameModule();
        List<CategoryDefinition> categories = module.getCategoryDefinitions(entities);

        System.out.println("Module class: " + module.getClass().getName());
        System.out.println("Total categories: " + categories.size());

        // Print every category label
        categories.forEach(c -> System.out.println(" - " + c.getLabel()));

        System.out.println("Generated " + categories.size() + " total categories");

        GridItem sample = entities.stream()
            .filter(e -> e.getId().equals("zhongli") || e.getDisplayName().equals("Zhongli"))
            .findFirst()
            .orElse(entities.get(0));

        System.out.println("Sample attributes: " + sample.getAttributes());

        var generator = new GridGenerator();
        Optional<GridGenerator.GeneratedPuzzle> result =
            generator.generate(entities, categories, LocalDate.now());

        if (result.isEmpty()) {
            System.out.println("FAILED to generate a valid puzzle");
            return;
        }

        var puzzle = result.get();
        System.out.println("Rows: " + puzzle.rowCategories().stream().map(CategoryDefinition::getLabel).toList());
        System.out.println("Cols: " + puzzle.colCategories().stream().map(CategoryDefinition::getLabel).toList());

        for (Map.Entry<String, List<String>> entry : puzzle.cellSolutions().entrySet()) {
            System.out.println("Cell " + entry.getKey() + ": " + entry.getValue().size() + " valid answers -> " + entry.getValue());
        }
    }
}